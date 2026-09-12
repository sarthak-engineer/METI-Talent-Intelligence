from typing import List

from app.models.schemas import ClaimEvidence


def summarize_claim_evidence(
    matrix: List[ClaimEvidence],
) -> dict:

    total = len(matrix)

    supported = sum(
        1
        for item in matrix
        if item.relationship == "SUPPORTS"
    )

    partially_supported = sum(
        1
        for item in matrix
        if item.relationship == "PARTIALLY_SUPPORTS"
    )

    not_supported = sum(
        1
        for item in matrix
        if item.relationship == "NOT_SUPPORTED"
    )

    conflicts = sum(
        1
        for item in matrix
        if item.relationship == "CONFLICTS"
    )

    claims_with_evidence = sum(
        1
        for item in matrix
        if item.evidence_ids
    )

    evidence_coverage = (
        claims_with_evidence / total
        if total
        else 0.0
    )

    evidence_confidence = (
        sum(item.confidence for item in matrix) / total
        if total
        else 0.0
    )

    return {
        "total_claims": total,
        "supported_claims": supported,
        "partially_supported_claims": partially_supported,
        "not_supported_claims": not_supported,
        "conflicts": conflicts,
        "claims_with_evidence": claims_with_evidence,
        "evidence_coverage": round(evidence_coverage, 4),
        "evidence_confidence": round(evidence_confidence, 4),
    }
