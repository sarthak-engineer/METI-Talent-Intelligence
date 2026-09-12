from datetime import datetime, timezone
from uuid import uuid4
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from app.assessment.attempts import (
    create_attempt,
    get_attempt,
    get_candidate_attempts,
    get_latest_attempt,
    update_attempt_status,
    update_attempt_evidence,
)
from app.assessment.diagnostic import (
    get_diagnostic_questions,
    QuestionType,
)
from app.assessment.evidence_builder import build_evidence_for_attempt
from app.assessment.selector import select_questions
from app.evidence.store import save_evidence
from app.models.schemas import AssessmentAttempt

router = APIRouter(
    prefix="/assessment",
    tags=["Assessment"],
)

class CandidateRequest(BaseModel):
    candidate_id: str

class AssessmentResponseItem(BaseModel):
    question_id: str
    response: Any

class AssessmentSubmitRequest(BaseModel):
    candidate_id: str
    target_pathway: str = "exploring"
    responses: List[AssessmentResponseItem]

@router.get("/questions")
def get_questions(
    candidate_id: Optional[str] = None, 
    target_pathway: str = "exploring",
):
    questions = select_questions(candidate_id=candidate_id, target_pathway=target_pathway)
    result = []
    for q in questions:
        q_dict = {
            "id": q.id,
            "question": q.question,
            "question_type": q.question_type.value,
            "required": q.required,
            "estimated_minutes": q.estimated_minutes,
        }
        if q.options:
            q_dict["options"] = [{"id": o.id, "text": o.text} for o in q.options]
        result.append(q_dict)
    return result

@router.post("/attempts")
def create_new_attempt(req: CandidateRequest):
    now = datetime.now(timezone.utc)
    attempt_id = f"ATT-{uuid4().hex[:8]}"
    
    latest_attempt = get_latest_attempt(req.candidate_id)
    attempt_number = latest_attempt.attempt_number + 1 if latest_attempt else 1
    previous_attempt_id = latest_attempt.id if latest_attempt else None
    
    attempt = AssessmentAttempt(
        id=attempt_id,
        candidate_id=req.candidate_id,
        assessment_version="v1.0",
        attempt_number=attempt_number,
        status="in_progress",
        evidence_ids=[],
        previous_attempt_id=previous_attempt_id,
        started_at=now,
        completed_at=None,
    )
    
    create_attempt(attempt)
    
    return {
        "attempt_id": attempt.id,
        "candidate_id": attempt.candidate_id,
        "attempt_number": attempt.attempt_number,
        "status": attempt.status,
        "total_questions": len(get_diagnostic_questions())
    }

@router.post("/attempts/{attempt_id}/submit")
def submit_attempt(attempt_id: str, req: AssessmentSubmitRequest):
    attempt = get_attempt(attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    if attempt.candidate_id != req.candidate_id:
        raise HTTPException(status_code=400, detail="Candidate ID mismatch")
        
    questions = {q.id: q for q in get_diagnostic_questions()}
    
    # Only enforce required questions that were actually assigned to this candidate
    assigned_questions = {q.id: q for q in select_questions(candidate_id=req.candidate_id, target_pathway=req.target_pathway)}
    
    # Convert responses list to dict
    response_map = {r.question_id: r.response for r in req.responses}
    
    # Validation
    for q_id, resp in response_map.items():
        if q_id not in questions:
            raise HTTPException(status_code=400, detail=f"Unknown question ID: {q_id}")
            
    if not response_map and any(q.required for q in assigned_questions.values()):
        raise HTTPException(status_code=400, detail="Assessment responses cannot be empty")
            
    for q_id in response_map:
        if q_id in questions:
            q = questions[q_id]
            resp = response_map[q_id]
            
            # Validation on response types
            if q.question_type == QuestionType.FREE_TEXT:
                if not isinstance(resp, str) or not resp.strip():
                    raise HTTPException(status_code=400, detail=f"Free text response cannot be empty for {q_id}")
            elif q.question_type == QuestionType.SINGLE_CHOICE:
                valid_ids = {opt.id for opt in q.options}
                if resp not in valid_ids:
                    raise HTTPException(status_code=400, detail=f"Invalid option ID for {q_id}: {resp}")
            elif q.question_type == QuestionType.RANKED:
                if not isinstance(resp, list) or not resp:
                    raise HTTPException(status_code=400, detail=f"Ranked response must be a list for {q_id}")
                valid_ids = {opt.id for opt in q.options}
                for r_id in resp:
                    if r_id not in valid_ids:
                        raise HTTPException(status_code=400, detail=f"Invalid option ID {r_id} for ranked question {q_id}")
            elif q.question_type == QuestionType.SCENARIO:
                if not isinstance(resp, str) or not resp.strip():
                    raise HTTPException(status_code=400, detail=f"Scenario response cannot be empty for {q_id}")
                
    try:
        # Convert option IDs back to option texts for the evidence builder
        # So the LLM sees "customer value" instead of "opt1"
        builder_responses = {}
        for q_id, resp in response_map.items():
            q = questions[q_id]
            if q.question_type == QuestionType.SINGLE_CHOICE:
                opt = next((o for o in q.options if o.id == resp), None)
                builder_responses[q_id] = opt.text if opt else resp
            elif q.question_type == QuestionType.RANKED:
                opt_texts = []
                for r_id in resp:
                    opt = next((o for o in q.options if o.id == r_id), None)
                    if opt:
                        opt_texts.append(opt.text)
                builder_responses[q_id] = opt_texts
            else:
                builder_responses[q_id] = resp

        evidence_items = build_evidence_for_attempt(
            candidate_id=req.candidate_id,
            attempt_id=attempt_id,
            responses=builder_responses,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    saved_evidence_ids = []
    for item in evidence_items:
        save_evidence(item)
        saved_evidence_ids.append(item.id)
    
    update_attempt_evidence(
        attempt_id=attempt_id,
        evidence_ids=[item.id for item in evidence_items],
    )
    
    update_attempt_status(
        attempt_id=attempt_id,
        status="completed",
        completed_at=datetime.now(timezone.utc),
    )
    
    return {
        "attempt_id": attempt_id,
        "status": "completed",
        "answered_count": len(response_map),
        "evidence_created_count": len(saved_evidence_ids),
        "evidence_ids": saved_evidence_ids,
        "message": "Assessment responses were converted into evidence and are ready for analysis."
    }

@router.get("/attempts/{attempt_id}")
def get_attempt_status(attempt_id: str):
    attempt = get_attempt(attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    return {
        "id": attempt.id,
        "candidate_id": attempt.candidate_id,
        "status": attempt.status,
        "started_at": attempt.started_at,
        "completed_at": attempt.completed_at,
        "evidence_count": len(attempt.evidence_ids),
    }

@router.get("/attempts/candidate/{candidate_id}")
def get_attempts_by_candidate(candidate_id: str):
    attempts = get_candidate_attempts(candidate_id)
    return [
        {
            "id": a.id,
            "candidate_id": a.candidate_id,
            "status": a.status,
            "started_at": a.started_at,
            "completed_at": a.completed_at,
            "evidence_count": len(a.evidence_ids),
        }
        for a in attempts
    ]
