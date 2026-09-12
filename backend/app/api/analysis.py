from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.agents.evidence_mapper import EvidenceMapperAgent

from app.assessment.attempts import (
    create_attempt,
    get_latest_attempt,
    update_attempt_status,
    get_candidate_attempts,
)

from app.evidence.store import (
    get_candidate_evidence,
    get_evidence_by_ids,
    update_evidence_competency_ids,
)

from app.api.portfolio_intelligence import analyze_portfolio_intelligence_internal
from app.evidence.portfolio_store import (
    get_latest_portfolio_intelligence,
)

from app.models.schemas import (
    AnalysisSnapshot,
    AssessmentAttempt,
    CompetencyEvaluation,
    EvidenceType,
)

from app.scoring.analysis_store import (
    get_saved_analysis,
    save_analysis,
)

from app.scoring.engine import (
    calculate_cci,
    calculate_evidence_confidence,
    calculate_evidence_coverage,
)

from app.scoring.evolution import build_evidence_evolution

from app.scoring.review_gate import evaluate_review_gate

from app.scoring.review_store import save_review_decision

from app.scoring.roles import (
    ROLE_PROFILES,
    CLIENT_FACING_ROLE_IDS,
)

from app.scoring.role_matcher import (
    match_all_roles,
    calculate_role_readiness,
)

from app.scoring.development import build_development_plan


router = APIRouter(
    prefix="/analysis",
    tags=["Analysis"],
)


def _extract_critical_flags(evaluations) -> list[str]:
    """
    Collect critical evaluation flags from the LLM evaluation output.

    The LLM may identify flags, but the Review Gate only consumes
    the structured flags. It does not allow the LLM to directly
    decide whether human review is required.
    """

    critical_flags = []

    for evaluation in evaluations:

        flags = getattr(
            evaluation,
            "flags",
            None,
        ) or []

        for flag in flags:

            critical_flags.append(
                f"{evaluation.competency_id}: {flag}"
            )

    return critical_flags


def _get_consistency_status(candidate_id: str) -> str:
    """
    Retrieve the latest available portfolio consistency result.

    Portfolio consistency is optional because not every candidate
    will necessarily have portfolio intelligence generated yet.

    If no portfolio consistency analysis exists, return
    'not_assessed' rather than pretending the candidate is consistent.
    """

    portfolio_intelligence = (
        get_latest_portfolio_intelligence(
            candidate_id
        )
    )

    if not portfolio_intelligence:
        return "not_assessed"

    matrix = portfolio_intelligence.get(
        "claim_evidence_matrix",
        [],
    )

    for item in matrix:

        if item.get("relationship") == "CONFLICTS":

            return "review_required"

    if any(
        item.get("relationship") in {
            "NOT_SUPPORTED",
            "PARTIALLY_SUPPORTS",
        }
        for item in matrix
    ):

        return "evidence_gaps"

    return "consistent"


def _is_client_facing_ready(
    role_readiness: list[dict],
) -> bool:
    """
    Determine whether the candidate has reached READY status
    for a configured client-facing role.

    This is deterministic business logic.

    A role that is merely DEVELOPING or READY_WITH_DEVELOPMENT
    does not trigger the client-facing review condition.
    """

    for readiness in role_readiness:

        role_id = readiness.get(
            "role_id"
        )

        status = readiness.get(
            "status"
        )

        if (
            role_id in CLIENT_FACING_ROLE_IDS
            and status == "READY"
        ):

            return True

    return False


@router.post("/{candidate_id}")
def analyze_candidate(candidate_id: str):

    """
    Generate a new immutable analysis snapshot.

    The LLM interprets qualitative evidence.

    Python calculates deterministic business metrics.

    Every analysis belongs to an AssessmentAttempt.

    Previous attempts and analysis snapshots are preserved.
    """

    all_evidence = get_candidate_evidence(
        candidate_id
    )

    if not all_evidence:
        raise HTTPException(
            status_code=400,
            detail="Complete your assessment before diagnosis.",
        )

    attempts = get_candidate_attempts(candidate_id)
    completed_attempts = [a for a in attempts if a.status == "completed"]
    latest_completed_attempt = max(
        completed_attempts, key=lambda a: a.attempt_number
    ) if completed_attempts else None

    latest_assessment_evidence_ids = (
        set(latest_completed_attempt.evidence_ids)
        if latest_completed_attempt
        else set()
    )

    evidence = []
    for item in all_evidence:
        if item.source.startswith("diagnostic_assessment:"):
            # Only include if it belongs to the latest completed attempt
            if latest_completed_attempt:
                if item.id in latest_assessment_evidence_ids:
                    evidence.append(item)
            else:
                evidence.append(item)
        else:
            # Include all other evidence types
            evidence.append(item)

    if not evidence:
        raise HTTPException(
            status_code=400,
            detail="Complete your assessment before diagnosis.",
        )

    try:

        # ========================================================
        # 1. RESOLVE ASSESSMENT ATTEMPT
        # ========================================================

        if not latest_completed_attempt:
            raise HTTPException(
                status_code=400,
                detail="A completed diagnostic assessment is required before capability diagnosis.",
            )

        attempt = latest_completed_attempt
        now = datetime.now(timezone.utc)

        # ========================================================
        # 2. LLM INTERPRETS EVIDENCE
        # ========================================================

        agent = EvidenceMapperAgent()

        evaluations = agent.evaluate(
            evidence
        )

        # Persist the semantic evidence → competency relationships
        # produced by the mapper back onto the EvidenceItems.
        evidence_to_competencies: dict[str, list[str]] = {}

        for evaluation in evaluations:
            competency_id = evaluation.competency_id

            for evidence_id in evaluation.evidence_ids:
                evidence_to_competencies.setdefault(
                    evidence_id,
                    [],
                ).append(competency_id)

        update_evidence_competency_ids(
            evidence_to_competencies
        )

        # Keep the in-memory evidence objects synchronized with
        # the persisted evidence store so deterministic scoring
        # uses the newly mapped competency IDs immediately.
        evidence_map = {
            item.id: item
            for item in evidence
        }

        for evidence_id, competency_ids in evidence_to_competencies.items():
            item = evidence_map.get(evidence_id)

            if item is None:
                continue

            item.competency_ids = sorted(
                set(item.competency_ids)
                | set(competency_ids)
            )

        # ========================================================
        # 3. DETERMINISTIC SCORING
        # ========================================================

        cci = calculate_cci(
            evaluations
        )

        evidence_coverage = (
            calculate_evidence_coverage(
                evidence
            )
        )

        evidence_confidence = (
            calculate_evidence_confidence(
                evidence,
                evaluations,
            )
        )

        role_matches = match_all_roles(
            evaluations,
            ROLE_PROFILES,
        )

        role_map = {
            role.id: role
            for role in ROLE_PROFILES
        }

        role_readiness = []

        for match in role_matches:
            role = role_map[match.role_id]

            readiness = calculate_role_readiness(
                evaluations,
                role,
            )

            role_readiness.append(
                {
                    "role_id": role.id,
                    "role_name": role.name,
                    "match_score": match.match_score,
                    **readiness,
                }
            )

        for index, readiness in enumerate(role_readiness):
            if index == 0:
                readiness["classification"] = "PRIMARY"
            elif readiness["status"] in {
                "READY",
                "READY_WITH_LOW_EVIDENCE_CONFIDENCE",
                "READY_WITH_DEVELOPMENT",
            }:
                readiness["classification"] = "STRETCH"
            else:
                readiness["classification"] = "DEVELOPING"

        development_plan = build_development_plan(
            evaluations=[
                evaluation.model_dump()
                for evaluation in evaluations
            ],
            role_intelligence=role_readiness,
        )

        # ========================================================
        # 4. BUILD EXPLAINABLE EVALUATIONS
        # ========================================================

        evaluation_payloads = []

        for evaluation in evaluations:

            payload = evaluation.model_dump()

            evidence_details = (
                get_evidence_by_ids(
                    evaluation.evidence_ids
                )
            )

            payload["evidence_details"] = [

                {
                    "id": item.id,

                    "source": item.source,

                    "evidence_type": (
                        item.evidence_type.value if hasattr(item.evidence_type, "value") else str(item.evidence_type)
                    ),

                    "source_confidence": (
                        item.confidence
                    ),

                    "text": item.text,

                    "created_at": (
                        item.created_at.isoformat()
                    ),

                    "source_version": (
                        item.source_version
                    ),
                }

                for item in evidence_details

            ]

            payload["unresolved_evidence_ids"] = [

                evidence_id

                for evidence_id
                in evaluation.evidence_ids

                if evidence_id not in {
                    item.id
                    for item in evidence_details
                }

            ]

            evaluation_payloads.append(
                payload
            )

        snapshot_id = (
            f"SNAP-{uuid4().hex[:8]}"
        )

        # ========================================================
        # 5. PREPARE REVIEW-GATE SIGNALS
        # ========================================================

        critical_flags = (
            _extract_critical_flags(
                evaluations
            )
        )

        # --------------------------------------------------------
        # Automatically generate Portfolio Intelligence if GitHub evidence exists
        # --------------------------------------------------------
        has_portfolio = any(
            item.evidence_type == EvidenceType.VERIFIED_PORTFOLIO 
            for item in evidence
        )
        if has_portfolio:
            try:
                analyze_portfolio_intelligence_internal(candidate_id, evidence)
            except Exception:
                # Do not crash the candidate diagnosis if GitHub portfolio intelligence fails
                pass

        consistency_status = (
            _get_consistency_status(
                candidate_id
            )
        )

        client_facing_ready = (
            _is_client_facing_ready(
                role_readiness
            )
        )

        # ========================================================
        # 6. DETERMINISTIC REVIEW GATE
        # ========================================================

        review_decision = (
            evaluate_review_gate(

                candidate_id=candidate_id,

                analysis_snapshot_id=snapshot_id,

                evidence_confidence=(
                    evidence_confidence
                ),

                consistency_status=(
                    consistency_status
                ),

                client_facing_ready=(
                    client_facing_ready
                ),

                critical_flags=(
                    critical_flags
                ),

            )
        )

        # ========================================================
        # 7. CREATE ANALYSIS SNAPSHOT
        # ========================================================

        analysis = {

            "id": snapshot_id,
            
            "snapshot_id": snapshot_id,

            "candidate_id": candidate_id,

            "attempt_id": attempt.id,

            "attempt_number": (
                attempt.attempt_number
            ),

            "previous_attempt_id": (
                attempt.previous_attempt_id
            ),

            "evaluations": (
                evaluation_payloads
            ),

            "cci": cci,

            "evidence_coverage": (
                evidence_coverage
            ),

            "evidence_confidence": (
                evidence_confidence
            ),

            "role_matches": [

                match.model_dump()

                for match in role_matches

            ],

            "role_readiness": (
                role_readiness
            ),

            "development_plan": development_plan,

            "review_decision": (
                review_decision.model_dump(
                    mode="json"
                )
            ),

            "scoring_version": "v1.0",

            "analysis_version": (
                "snapshot-1.0"
            ),

            "created_at": (
                now.isoformat()
            ),

        }

        save_analysis(
            candidate_id,
            analysis,
        )

        save_review_decision(
            review_decision
        )

        return analysis

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {exc}",
        ) from exc


@router.get("/{candidate_id}")
def get_analysis(candidate_id: str):

    """
    Return the latest persisted analysis snapshot.

    This endpoint does NOT call the LLM.
    """

    analysis = get_saved_analysis(
        candidate_id
    )

    if not analysis:

        raise HTTPException(
            status_code=404,
            detail=(
                "No analysis snapshot found for "
                "this candidate. Run POST "
                "/api/analysis/{candidate_id} first."
            ),
        )

    return analysis


@router.get("/{candidate_id}/evolution")
def get_analysis_evolution(candidate_id: str):
    """
    Return the deterministic before/after evolution between
    the latest two immutable analysis snapshots.

    This endpoint does not call the LLM and does not modify
    any stored analysis snapshot.
    """

    return build_evidence_evolution(candidate_id)
