from typing import List

from app.models.schemas import ClaimEvidence


VALID_RELATIONSHIPS = {
    "SUPPORTS",
    "PARTIALLY_SUPPORTS",
    "NOT_SUPPORTED",
    "CONFLICTS",
}


def check_consistency(matrix: List[ClaimEvidence]) -> dict:
    """
    Evaluate the existing Claim -> Evidence Matrix.

    Important:
    - NOT_SUPPORTED does not mean contradictory.
    - Only explicit CONFLICTS are treated as conflicts.
    - The function does not make hiring decisions.
    """

    conflicts = []
    unverified = []
    partial = []
    supported = []

    for item in matrix:
        relationship = item.relationship

        if relationship not in VALID_RELATIONSHIPS:
            continue

        if relationship == "CONFLICTS":
            conflicts.append(
                {
                    "claim": item.claim,
                    "type": "potential_conflict",
                    "severity": "medium",
                    "confidence": round(item.confidence, 4),
                    "evidence_ids": item.evidence_ids,
                    "reason": item.explanation,
                }
            )

        elif relationship == "NOT_SUPPORTED":
            unverified.append(
                {
                    "claim": item.claim,
                    "type": "unverified_claim",
                    "severity": "low",
                    "confidence": round(item.confidence, 4),
                    "evidence_ids": item.evidence_ids,
                    "reason": item.explanation,
                }
            )

        elif relationship == "PARTIALLY_SUPPORTS":
            partial.append(
                {
                    "claim": item.claim,
                    "type": "partial_support",
                    "severity": "low",
                    "confidence": round(item.confidence, 4),
                    "evidence_ids": item.evidence_ids,
                    "reason": item.explanation,
                }
            )

        elif relationship == "SUPPORTS":
            supported.append(item.claim)

    if conflicts:
        status = "review_required"
        summary = (
            f"{len(conflicts)} potential conflict(s) were identified "
            "between candidate claims and available evidence. "
            "Human review is recommended."
        )
    elif unverified or partial:
        status = "evidence_gaps"
        summary = (
            f"{len(unverified)} claim(s) could not be verified and "
            f"{len(partial)} claim(s) received partial evidence support. "
            "No direct contradiction was identified."
        )
    else:
        status = "consistent"
        summary = (
            "Available evidence is consistent with the evaluated claims. "
            "No potential conflicts were identified."
        )

    return {
        "status": status,
        "summary": summary,
        "supported_claims": len(supported),
        "partially_supported_claims": len(partial),
        "unverified_claims": len(unverified),
        "potential_conflicts": len(conflicts),
        "issues": conflicts + partial + unverified,
    }
