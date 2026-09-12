from app.models.schemas import EvidenceType


EVIDENCE_CONFIDENCE = {
    EvidenceType.SELF_REPORT: 0.25,
    EvidenceType.STRUCTURED_SCENARIO: 0.55,
    EvidenceType.WRITTEN_RESPONSE: 0.65,
    EvidenceType.VERIFIED_PORTFOLIO: 0.75,
    EvidenceType.CONSULTING_RESPONSE: 0.80,
    EvidenceType.CASE_WORK_SAMPLE: 0.85,
    EvidenceType.HUMAN_REVIEW: 0.95,
}


def get_evidence_confidence(evidence_type: EvidenceType) -> float:
    return EVIDENCE_CONFIDENCE[evidence_type]
