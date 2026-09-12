from typing import Any

from app.assessment.questions import COMPETENCIES
from app.scoring.evolution import build_evidence_evolution
from app.scoring.candidate_store import get_candidate
from app.evidence.store import get_candidate_evidence


COMPETENCY_NAMES = {
    competency.id: competency.name
    for competency in COMPETENCIES
}


def _competency_name(evaluation):
    competency_id = evaluation.get("competency_id")

    return (
        evaluation.get("competency_name")
        or COMPETENCY_NAMES.get(
            competency_id,
            competency_id,
        )
    )


def _get_evaluation_score(evaluation: dict[str, Any]) -> float:
    return float(evaluation.get("score", 0.0))


def _get_evaluation_confidence(evaluation: dict[str, Any]) -> float:
    return float(evaluation.get("confidence", 0.0))


def _build_strengths(
    evaluations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Identify the strongest demonstrated competencies.

    This is deterministic. The report layer does not ask the LLM
    to invent strengths.
    """

    ranked = sorted(
        evaluations,
        key=_get_evaluation_score,
        reverse=True,
    )

    strengths = []

    for evaluation in ranked[:3]:

        score = _get_evaluation_score(evaluation)

        if score < 60:
            continue

        strengths.append(
            {
                "competency_id": evaluation.get(
                    "competency_id"
                ),
                "competency_name": _competency_name(evaluation),
                "score": round(score, 2),
                "confidence": round(
                    _get_evaluation_confidence(
                        evaluation
                    ),
                    3,
                ),
                "evidence_ids": evaluation.get(
                    "evidence_ids",
                    [],
                ),
            }
        )

    return strengths


def _build_development_priorities(
    evaluations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Identify the lowest-scoring competencies.

    These are development priorities, not rejection decisions.
    """

    ranked = sorted(
        evaluations,
        key=_get_evaluation_score,
    )

    priorities = []

    for evaluation in ranked[:3]:

        score = _get_evaluation_score(evaluation)

        priorities.append(
            {
                "competency_id": evaluation.get(
                    "competency_id"
                ),
                "competency_name": _competency_name(evaluation),
                "score": round(score, 2),
                "confidence": round(
                    _get_evaluation_confidence(
                        evaluation
                    ),
                    3,
                ),
                "evidence_ids": evaluation.get(
                    "evidence_ids",
                    [],
                ),
                "flags": evaluation.get(
                    "flags",
                    [],
                ),
            }
        )

    return priorities


def _build_role_intelligence(
    role_matches: list[dict[str, Any]],
    role_readiness: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Combine role match and role readiness into one explainable
    role-intelligence structure.
    """

    readiness_by_role = {
        item.get("role_id"): item
        for item in role_readiness
    }

    result = []

    for match in role_matches:

        role_id = match.get("role_id")

        readiness = readiness_by_role.get(
            role_id,
            {},
        )

        result.append(
            {
                "role_id": role_id,
                "role_name": match.get(
                    "role_name"
                ),
                "match_score": match.get(
                    "match_score",
                    0.0,
                ),
                "readiness_status": readiness.get(
                    "status",
                    "INSUFFICIENT_EVIDENCE",
                ),
                "readiness_score": readiness.get(
                    "readiness_score",
                    0.0,
                ),
                "requirements_met": readiness.get(
                    "requirements_met",
                    0,
                ),
                "requirements_total": readiness.get(
                    "requirements_total",
                    0,
                ),
                "confidence": readiness.get(
                    "confidence",
                    0.0,
                ),
                "blocking_gaps": readiness.get(
                    "blocking_gaps",
                    [],
                ),
            }
        )

    return result


def generate_summary(
    analysis: dict[str, Any],
) -> dict[str, Any]:
    """
    Generate the always-available Summary of Findings.

    All underlying findings come from the persisted analysis
    snapshot. No new LLM inference occurs here.
    """

    evaluations = analysis.get(
        "evaluations",
        [],
    )

    role_matches = analysis.get(
        "role_matches",
        [],
    )

    role_readiness = analysis.get(
        "role_readiness",
        [],
    )

    review_decision = analysis.get(
        "review_decision",
        {},
    )

    role_intelligence = _build_role_intelligence(
        role_matches,
        role_readiness,
    )

    top_role = (
        role_intelligence[0]
        if role_intelligence
        else None
    )

    return {
        "report_type": "summary",
        "snapshot_id": analysis.get(
            "snapshot_id"
        ),
        "candidate_id": analysis.get(
            "candidate_id"
        ),
        "attempt_id": analysis.get(
            "attempt_id"
        ),
        "attempt_number": analysis.get(
            "attempt_number"
        ),
        "cci": analysis.get(
            "cci",
            0.0,
        ),
        "evidence_coverage": analysis.get(
            "evidence_coverage",
            0.0,
        ),
        "evidence_confidence": analysis.get(
            "evidence_confidence",
            0.0,
        ),
        "top_role": top_role,
        "strengths": _build_strengths(
            evaluations
        ),
        "development_priorities": (
            _build_development_priorities(
                evaluations
            )
        ),
        "review": {
            "required": review_decision.get(
                "review_required",
                False,
            ),
            "reasons": review_decision.get(
                "reasons",
                [],
            ),
            "status": review_decision.get(
                "status"
            ),
        },
    }


def generate_detailed_report(
    analysis: dict[str, Any],
) -> dict[str, Any]:
    """
    Generate the detailed report from the same immutable
    analysis snapshot.

    The entitlement check happens at the API layer.
    """

    summary = generate_summary(analysis)

    candidate_id = analysis.get("candidate_id")
    candidate = get_candidate(candidate_id) if candidate_id else None

    candidate_name = candidate.full_name if candidate else candidate_id
    target_role = candidate.target_pathway if candidate else (summary["top_role"]["role_name"] if summary.get("top_role") else None)
    top_role_name = summary["top_role"]["role_name"] if summary.get("top_role") else "Not determined"

    executive_summary = {
        "candidate_id": candidate_id,
        "candidate_name": candidate_name,
        "target_role": target_role,
        "primary_role": top_role_name,
        "cci": summary["cci"],
        "evidence_coverage": summary["evidence_coverage"],
        "evidence_confidence": summary["evidence_confidence"],
        "readiness_status": summary["top_role"]["readiness_status"] if summary.get("top_role") else "DEVELOPING",
        "narrative": f"Comprehensive capability diagnosis for {candidate_name} based on multi-source evidence synthesis. Overall Composite Capability Index (CCI) is {round(summary['cci'], 1)} with {round(summary['evidence_coverage']*100)}% coverage across the 14-domain competency framework.",
    }

    role_intelligence = _build_role_intelligence(
        analysis.get("role_matches", []),
        analysis.get("role_readiness", []),
    )

    development_plan = analysis.get("development_plan", {})

    return {
        **summary,
        "report_type": "detailed",
        "executive_summary": executive_summary,

        "development_plan": development_plan,

        "competency_analysis": analysis.get(
            "evaluations",
            [],
        ),

        "role_intelligence": _build_role_intelligence(
            analysis.get(
                "role_matches",
                [],
            ),
            analysis.get(
                "role_readiness",
                [],
            ),
        ),

        "scoring": {
            "cci": analysis.get(
                "cci",
                0.0,
            ),
            "evidence_coverage": analysis.get(
                "evidence_coverage",
                0.0,
            ),
            "evidence_confidence": analysis.get(
                "evidence_confidence",
                0.0,
            ),
            "scoring_version": analysis.get(
                "scoring_version"
            ),
            "analysis_version": analysis.get(
                "analysis_version"
            ),
        },

        "evidence_explorer": [
            {
                "competency_id": evaluation.get("competency_id"),
                "competency_name": _competency_name(evaluation),
                "score": evaluation.get("score"),
                "confidence": evaluation.get("confidence"),
                "evidence_ids": evaluation.get("evidence_ids", []),
                "evidence_details": evaluation.get("evidence_details", []),
            }
            for evaluation in analysis.get("evaluations", [])
        ],

        "unmapped_evidence": [
            {
                "id": item.id,
                "source": item.source,
                "evidence_type": item.evidence_type.value if hasattr(item.evidence_type, "value") else str(item.evidence_type),
                "source_confidence": item.confidence,
                "text": item.text,
            }
            for item in (get_candidate_evidence(candidate_id) if candidate_id else [])
            if not getattr(item, "competency_ids", [])
        ],

        "evidence_evolution": build_evidence_evolution(
            analysis.get("candidate_id")
        ),
    }
