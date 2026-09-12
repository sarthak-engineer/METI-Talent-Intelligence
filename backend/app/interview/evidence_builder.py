from datetime import datetime, timezone
from typing import Any, Dict

from app.models.schemas import EvidenceItem, EvidenceType


from typing import Any, Dict, Optional


def build_interview_evidence(
    candidate_id: str,
    question: Dict[str, Any],
    answer: str,
    evaluation: Dict[str, Any],
    pathway: Optional[str] = None,
    attempt_id: Optional[str] = None,
) -> EvidenceItem:

    comp_ids = question.get("competency_ids") or []
    if not comp_ids and question.get("competency_id"):
        comp_ids = [question.get("competency_id")]

    return EvidenceItem(
        id=f"INT-E-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
        candidate_id=candidate_id,
        source="adaptive_interview",
        evidence_type=EvidenceType.CONSULTING_RESPONSE,
        text=answer.strip(),
        competency_ids=comp_ids,
        confidence=0.80,
        created_at=datetime.now(timezone.utc),
        source_version="adaptive-interview-v1.0",
        attempt_id=attempt_id or question.get("attempt_id"),
        question_id=question.get("question_id") or question.get("id"),
        pathway=pathway or question.get("pathway"),
        category=question.get("category"),
        source_evidence_ids=question.get("source_evidence_ids") or [],
        evidence_to_verify=question.get("evidence_to_verify"),
    )
