from typing import List

from app.models.schemas import ClaimEvidence, EvidenceItem
from app.evidence.confidence import EVIDENCE_CONFIDENCE


RELATIONSHIP_FACTOR = {
    "SUPPORTS": 1.0,
    "PARTIALLY_SUPPORTS": 0.65,
    "NOT_SUPPORTED": 0.0,
    "CONFLICTS": 0.0,
}


def calculate_claim_confidence(
    claim: ClaimEvidence,
    evidence_items: List[EvidenceItem],
) -> float:
    """
    Calculate confidence in the evidence supporting one claim.

    This measures the quality of available evidence for the claim.
    It does not treat absence of evidence as contradictory evidence.
    """

    if not claim.evidence_ids:
        return 0.0

    evidence_by_id = {
        item.id: item
        for item in evidence_items
    }

    matched_evidence = [
        evidence_by_id[evidence_id]
        for evidence_id in claim.evidence_ids
        if evidence_id in evidence_by_id
    ]

    if not matched_evidence:
        return 0.0

    source_confidences = []

    for item in matched_evidence:
        source_confidence = EVIDENCE_CONFIDENCE.get(
            item.evidence_type,
            item.confidence,
        )

        source_confidences.append(
            max(0.0, min(1.0, source_confidence))
        )

    source_confidence = (
        sum(source_confidences) / len(source_confidences)
    )

    model_confidence = max(
        0.0,
        min(1.0, claim.confidence),
    )

    relationship_factor = RELATIONSHIP_FACTOR.get(
        claim.relationship,
        0.0,
    )

    return round(
        source_confidence
        * model_confidence
        * relationship_factor,
        4,
    )


def calculate_evidence_confidence(
    matrix: List[ClaimEvidence],
    evidence_items: List[EvidenceItem],
) -> float:
    """
    Calculate confidence in the evidence that is actually available.

    Unsupported claims are excluded from the denominator because
    they represent evidence gaps, not low-quality evidence.

    Evidence coverage should be reported separately.
    """

    supported_scores = []

    for claim in matrix:
        score = calculate_claim_confidence(
            claim,
            evidence_items,
        )

        if score > 0:
            supported_scores.append(score)

    if not supported_scores:
        return 0.0

    return round(
        sum(supported_scores) / len(supported_scores),
        4,
    )
