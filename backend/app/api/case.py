import uuid
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.agents.case_evaluator import CaseEvaluatorAgent
from app.case.definitions import get_case_by_role, get_case_by_id, ConsultingCase
from app.evidence.confidence import EVIDENCE_CONFIDENCE
from app.evidence.store import get_candidate_evidence, save_evidence
from app.models.schemas import EvidenceItem, EvidenceType

router = APIRouter(
    prefix="/case",
    tags=["Consulting Case"],
)


class CaseAttemptResponse(BaseModel):
    attempt_id: str
    candidate_id: str
    case_id: str
    status: str
    started_at: datetime


class CaseSubmitRequest(BaseModel):
    candidate_response: str = Field(
        min_length=20,
        max_length=15000,
    )


# Temporary in-memory store for attempts since we don't have a dedicated DB for case attempts
# Ideally this would share the assessment attempts store or have its own
# We just need to validate attempt_id exists and status
_case_attempts = {}


@router.get("/")
def get_case(pathway: str) -> ConsultingCase:
    case = get_case_by_role(pathway)
    if not case:
        raise HTTPException(
            status_code=404,
            detail=f"No case found for pathway: {pathway}",
        )
    return case


@router.post("/attempts")
def create_case_attempt(candidate_id: str, case_id: str) -> CaseAttemptResponse:
    case = get_case_by_id(case_id)
    if not case:
        raise HTTPException(
            status_code=404,
            detail=f"No case found with id: {case_id}",
        )

    attempt_id = f"CA-{uuid.uuid4().hex[:8]}"
    started_at = datetime.now(timezone.utc)

    attempt = {
        "attempt_id": attempt_id,
        "candidate_id": candidate_id,
        "case_id": case_id,
        "status": "in_progress",
        "started_at": started_at,
    }
    
    _case_attempts[attempt_id] = attempt

    return CaseAttemptResponse(**attempt)


@router.get("/attempts/{attempt_id}")
def get_case_attempt(attempt_id: str) -> CaseAttemptResponse:
    attempt = _case_attempts.get(attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return CaseAttemptResponse(**attempt)


@router.post("/attempts/{attempt_id}/submit")
def submit_case_attempt(
    attempt_id: str,
    submission: CaseSubmitRequest,
):
    attempt = _case_attempts.get(attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    if attempt["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Attempt is already submitted")

    case = get_case_by_id(attempt["case_id"])
    if not case:
        raise HTTPException(status_code=404, detail="Case definition not found")

    candidate_id = attempt["candidate_id"]
    existing_evidence = get_candidate_evidence(candidate_id)
    if not existing_evidence:
        # Based on existing error message logic but adapting for generalized attempts
        raise HTTPException(
            status_code=404,
            detail="Candidate has no existing evidence. Upload a resume first.",
        )

    evidence_id = (
        f"case-{candidate_id}-"
        f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}"
    )

    evidence = EvidenceItem(
        id=evidence_id,
        candidate_id=candidate_id,
        source="consulting_case",
        evidence_type=EvidenceType.CASE_WORK_SAMPLE,
        text=(
            f"CASE TITLE:\n{case.title}\n\n"
            f"CASE:\n{case.scenario}\n\n"
            f"INSTRUCTIONS:\n{case.instructions}\n\n"
            f"CANDIDATE RESPONSE:\n{submission.candidate_response}"
        ),
        competency_ids=case.expected_competency_ids,
        canonical_competency_ids=case.expected_competency_ids,
        confidence=EVIDENCE_CONFIDENCE[
            EvidenceType.CASE_WORK_SAMPLE
        ],
        created_at=datetime.now(timezone.utc),
        source_version="case-v1.0",
        attempt_id=attempt_id,
        question_id=case.case_id,
    )

    save_evidence(evidence)
    
    # Mark attempt as submitted
    attempt["status"] = "submitted"

    try:
        evaluator = CaseEvaluatorAgent()

        evaluation = evaluator.evaluate(
            case_title=case.title,
            case_prompt=f"{case.scenario}\n{case.instructions}",
            candidate_response=submission.candidate_response,
            expected_competency_ids=case.expected_competency_ids,
            evaluation_rubric=case.evaluation_rubric,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Case evaluation failed: {exc}",
        ) from exc

    return {
        "candidate_id": candidate_id,
        "evidence": evidence.model_dump(mode="json"),
        "evaluation": evaluation,
        "message": "Consulting case submitted and evaluated successfully.",
    }
