from datetime import datetime, timezone
import hashlib
from typing import Any, Dict, List

from app.models.schemas import EvidenceItem, EvidenceType
from app.evidence.confidence import get_evidence_confidence
from app.assessment.diagnostic import (
    get_diagnostic_question,
    QuestionType,
)


def _generate_deterministic_id(attempt_id: str, question_id: str) -> str:
    hash_input = f"{attempt_id}:{question_id}".encode("utf-8")
    hash_hex = hashlib.sha256(hash_input).hexdigest()[:8]
    return f"EVI-{hash_hex}"


def _map_question_type(question_type: QuestionType) -> EvidenceType:
    mapping = {
        QuestionType.SINGLE_CHOICE: EvidenceType.STRUCTURED_SCENARIO,
        QuestionType.SCENARIO: EvidenceType.STRUCTURED_SCENARIO,
        QuestionType.RANKED: EvidenceType.STRUCTURED_SCENARIO,
        QuestionType.FREE_TEXT: EvidenceType.WRITTEN_RESPONSE,
    }
    
    evidence_type = mapping.get(question_type)
    if not evidence_type:
        raise ValueError(f"Unknown question type: {question_type}")
        
    return evidence_type


def build_evidence_for_response(
    candidate_id: str,
    attempt_id: str,
    question_id: str,
    response_data: Any,
) -> EvidenceItem:
    
    question = get_diagnostic_question(question_id)
    if not question:
        raise ValueError(f"Unknown question ID: {question_id}")
        
    if response_data is None:
        raise ValueError(f"Empty response for question {question_id}")
        
    if isinstance(response_data, str) and not response_data.strip():
        raise ValueError(f"Empty free-text response for question {question_id}")
        
    if isinstance(response_data, list) and not response_data:
        raise ValueError(f"Empty option response for question {question_id}")

    if isinstance(response_data, list):
        if question.question_type == QuestionType.RANKED:
            formatted_response = "\n" + "\n".join(f"{i+1}. {r}" for i, r in enumerate(response_data))
        else:
            formatted_response = ", ".join(str(r) for r in response_data)
    else:
        formatted_response = str(response_data).strip()
        
    if not formatted_response:
        raise ValueError(f"Empty response for question {question_id}")

    combined_text = f"Assessment question: {question.question}\n\nCandidate response: {formatted_response}"

    evidence_type = _map_question_type(question.question_type)
    confidence = get_evidence_confidence(evidence_type)

    if not question.canonical_competency_ids:
        raise ValueError(f"Generated evidence {question_id} has no canonical competency IDs")

    composite_ids = question.composite_competency_ids
    if not composite_ids:
        raise ValueError(f"Generated evidence {question_id} has no composite competency IDs")

    evidence_id = _generate_deterministic_id(attempt_id, question_id)
    source = f"diagnostic_assessment:{attempt_id}"

    return EvidenceItem(
        id=evidence_id,
        candidate_id=candidate_id,
        source=source,
        evidence_type=evidence_type,
        text=combined_text,
        competency_ids=composite_ids,
        canonical_competency_ids=question.canonical_competency_ids,
        confidence=confidence,
        created_at=datetime.now(timezone.utc),
        source_version="v1",
        attempt_id=attempt_id,
        question_id=question_id,
    )


def build_evidence_for_attempt(
    candidate_id: str,
    attempt_id: str,
    responses: Dict[str, Any],
) -> List[EvidenceItem]:
    
    evidence_items = []
    
    for question_id, response_data in responses.items():
        evidence = build_evidence_for_response(
            candidate_id=candidate_id,
            attempt_id=attempt_id,
            question_id=question_id,
            response_data=response_data,
        )
        evidence_items.append(evidence)
        
    return evidence_items
