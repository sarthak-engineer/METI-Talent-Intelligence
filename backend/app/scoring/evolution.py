from typing import Any

from app.scoring.analysis_store import get_analysis_snapshots


def _round_change(after: float, before: float) -> float:
    return round(after - before, 3)


def _get_evaluation_map(
    snapshot: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    return {
        evaluation.get("competency_id"): evaluation
        for evaluation in snapshot.get("evaluations", [])
        if evaluation.get("competency_id")
    }


def _get_all_evidence_ids(
    snapshot: dict[str, Any],
) -> set[str]:
    evidence_ids: set[str] = set()

    for evaluation in snapshot.get("evaluations", []):
        for evidence_id in evaluation.get("evidence_ids", []):
            if evidence_id:
                evidence_ids.add(evidence_id)

    return evidence_ids


def _build_competency_changes(
    before: dict[str, Any],
    after: dict[str, Any],
) -> list[dict[str, Any]]:
    before_map = _get_evaluation_map(before)
    after_map = _get_evaluation_map(after)

    competency_ids = sorted(
        set(before_map) | set(after_map)
    )

    changes = []

    for competency_id in competency_ids:
        before_evaluation = before_map.get(competency_id)
        after_evaluation = after_map.get(competency_id)

        before_score = (
            float(before_evaluation.get("score", 0.0))
            if before_evaluation
            else None
        )

        after_score = (
            float(after_evaluation.get("score", 0.0))
            if after_evaluation
            else None
        )

        before_confidence = (
            float(before_evaluation.get("confidence", 0.0))
            if before_evaluation
            else None
        )

        after_confidence = (
            float(after_evaluation.get("confidence", 0.0))
            if after_evaluation
            else None
        )

        before_evidence_ids = set(
            before_evaluation.get("evidence_ids", [])
            if before_evaluation
            else []
        )

        after_evidence_ids = set(
            after_evaluation.get("evidence_ids", [])
            if after_evaluation
            else []
        )

        new_evidence_ids = sorted(
            after_evidence_ids - before_evidence_ids
        )

        changes.append(
            {
                "competency_id": competency_id,
                "before_score": (
                    round(before_score, 2)
                    if before_score is not None
                    else None
                ),
                "after_score": (
                    round(after_score, 2)
                    if after_score is not None
                    else None
                ),
                "score_change": (
                    _round_change(
                        after_score,
                        before_score,
                    )
                    if (
                        before_score is not None
                        and after_score is not None
                    )
                    else None
                ),
                "before_confidence": (
                    round(before_confidence, 3)
                    if before_confidence is not None
                    else None
                ),
                "after_confidence": (
                    round(after_confidence, 3)
                    if after_confidence is not None
                    else None
                ),
                "confidence_change": (
                    _round_change(
                        after_confidence,
                        before_confidence,
                    )
                    if (
                        before_confidence is not None
                        and after_confidence is not None
                    )
                    else None
                ),
                "new_evidence_ids": new_evidence_ids,
            }
        )

    changes.sort(
        key=lambda item: (
            abs(item["score_change"])
            if item["score_change"] is not None
            else -1
        ),
        reverse=True,
    )

    return changes


def _build_role_readiness_changes(
    before: dict[str, Any],
    after: dict[str, Any],
) -> list[dict[str, Any]]:
    before_roles = {
        role.get("role_id"): role
        for role in before.get("role_readiness", [])
        if role.get("role_id")
    }

    after_roles = {
        role.get("role_id"): role
        for role in after.get("role_readiness", [])
        if role.get("role_id")
    }

    role_ids = sorted(set(before_roles) | set(after_roles))
    changes = []

    for role_id in role_ids:
        before_role = before_roles.get(role_id)
        after_role = after_roles.get(role_id)

        before_score = (
            float(before_role.get("readiness_score", 0.0))
            if before_role
            else None
        )

        after_score = (
            float(after_role.get("readiness_score", 0.0))
            if after_role
            else None
        )

        before_requirements_met = (
            int(before_role.get("requirements_met", 0))
            if before_role
            else None
        )

        after_requirements_met = (
            int(after_role.get("requirements_met", 0))
            if after_role
            else None
        )

        before_gaps = set(
            before_role.get("blocking_gaps", [])
            if before_role
            else []
        )

        after_gaps = set(
            after_role.get("blocking_gaps", [])
            if after_role
            else []
        )

        changes.append(
            {
                "role_id": role_id,
                "role_name": (
                    after_role.get("role_name")
                    if after_role
                    else before_role.get("role_name")
                ),
                "before_status": (
                    before_role.get("status")
                    if before_role
                    else None
                ),
                "after_status": (
                    after_role.get("status")
                    if after_role
                    else None
                ),
                "before_readiness_score": (
                    round(before_score, 2)
                    if before_score is not None
                    else None
                ),
                "after_readiness_score": (
                    round(after_score, 2)
                    if after_score is not None
                    else None
                ),
                "readiness_change": (
                    _round_change(
                        after_score,
                        before_score,
                    )
                    if (
                        before_score is not None
                        and after_score is not None
                    )
                    else None
                ),
                "before_requirements_met": before_requirements_met,
                "after_requirements_met": after_requirements_met,
                "requirements_change": (
                    after_requirements_met
                    - before_requirements_met
                    if (
                        before_requirements_met is not None
                        and after_requirements_met is not None
                    )
                    else None
                ),
                "resolved_blocking_gaps": sorted(
                    before_gaps - after_gaps
                ),
                "new_blocking_gaps": sorted(
                    after_gaps - before_gaps
                ),
            }
        )

    changes.sort(
        key=lambda item: (
            abs(item["readiness_change"])
            if item["readiness_change"] is not None
            else -1
        ),
        reverse=True,
    )

    return changes


def build_evidence_evolution(
    candidate_id: str,
) -> dict[str, Any]:
    """
    Build a deterministic before/after comparison between the
    latest two immutable analysis snapshots for a candidate.

    No LLM is called and no stored snapshot is modified.
    """

    snapshots = get_analysis_snapshots(candidate_id)

    if len(snapshots) < 2:
        return {
            "available": False,
            "candidate_id": candidate_id,
            "reason": (
                "A before/after comparison requires "
                "at least two completed analysis snapshots."
            ),
        }

    before = snapshots[-2]
    after = snapshots[-1]

    before_evidence_ids = _get_all_evidence_ids(before)
    after_evidence_ids = _get_all_evidence_ids(after)

    new_evidence_ids = sorted(
        after_evidence_ids - before_evidence_ids
    )

    before_cci = float(before.get("cci", 0.0))
    after_cci = float(after.get("cci", 0.0))

    before_confidence = float(
        before.get("evidence_confidence", 0.0)
    )
    after_confidence = float(
        after.get("evidence_confidence", 0.0)
    )

    before_coverage = float(
        before.get("evidence_coverage", 0.0)
    )
    after_coverage = float(
        after.get("evidence_coverage", 0.0)
    )

    return {
        "available": True,
        "candidate_id": candidate_id,

        "before": {
            "snapshot_id": before.get("snapshot_id"),
            "attempt_id": before.get("attempt_id"),
            "attempt_number": before.get("attempt_number"),
            "cci": before_cci,
            "evidence_confidence": before_confidence,
            "evidence_coverage": before_coverage,
        },

        "after": {
            "snapshot_id": after.get("snapshot_id"),
            "attempt_id": after.get("attempt_id"),
            "attempt_number": after.get("attempt_number"),
            "previous_attempt_id": after.get(
                "previous_attempt_id"
            ),
            "cci": after_cci,
            "evidence_confidence": after_confidence,
            "evidence_coverage": after_coverage,
        },

        "changes": {
            "cci": _round_change(
                after_cci,
                before_cci,
            ),
            "evidence_confidence": _round_change(
                after_confidence,
                before_confidence,
            ),
            "evidence_coverage": _round_change(
                after_coverage,
                before_coverage,
            ),
            "new_evidence_count": len(
                new_evidence_ids
            ),
        },

        "new_evidence_ids": new_evidence_ids,

        "competency_changes": (
            _build_competency_changes(
                before,
                after,
            )
        ),
        "role_readiness_changes": (
            _build_role_readiness_changes(
                before,
                after,
            )
        ),
    }
