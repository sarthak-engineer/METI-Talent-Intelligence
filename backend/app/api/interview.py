from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.assessment.attempts import get_latest_attempt
from app.interview.questions import select_interview_questions
from app.interview.store import (
    add_answer,
    complete_interview,
    create_interview,
    get_candidate_interviews,
    get_interview,
)
from app.scoring.analysis_store import get_saved_analysis
from app.interview.evidence_builder import build_interview_evidence
from app.agents.interview_evaluator import evaluate_interview_answer
from app.evidence.store import save_evidence


router = APIRouter(
    prefix="/interview",
    tags=["Structured Interview"],
)

class AnswerRequest(BaseModel):
    question_id: str
    answer: str = Field(min_length=1, max_length=10000)


@router.get("/questions")
def generate_questions(candidate_id: str, pathway: str):
    """
    Generate interview questions based on candidate evidence and pathway.
    """
    analysis = get_saved_analysis(candidate_id)

    if not analysis:
        # Fallback to empty evaluations if no analysis exists
        evaluations = []
    else:
        evals = analysis.get("evaluations", []) if isinstance(analysis, dict) else analysis.evaluations
        evaluations = [
            evaluation.model_dump(mode="json")
            if hasattr(evaluation, "model_dump")
            else evaluation
            for evaluation in evals
        ]

    questions = select_interview_questions(
        candidate_id=candidate_id,
        pathway=pathway,
        evaluations=evaluations,
        max_questions=6,
    )

    if not questions:
        raise HTTPException(
            status_code=400,
            detail="Could not generate questions.",
        )

    return {
        "candidate_id": candidate_id,
        "pathway": pathway,
        "questions": questions,
    }


@router.post("/attempts")
def create_attempt(candidate_id: str, pathway: str):
    """
    Creates a new interview attempt and generates questions for it.
    """
    analysis = get_saved_analysis(candidate_id)

    if not analysis:
        evaluations = []
    else:
        evals = analysis.get("evaluations", []) if isinstance(analysis, dict) else analysis.evaluations
        evaluations = [
            evaluation.model_dump(mode="json")
            if hasattr(evaluation, "model_dump")
            else evaluation
            for evaluation in evals
        ]

    questions = select_interview_questions(
        candidate_id=candidate_id,
        pathway=pathway,
        evaluations=evaluations,
        max_questions=6,
    )

    if not questions:
        raise HTTPException(
            status_code=400,
            detail="Could not generate questions for interview attempt.",
        )

    latest_attempt = get_latest_attempt(candidate_id)

    interview_id = f"INT-{uuid4().hex[:8]}"

    interview = create_interview(
        interview_id=interview_id,
        candidate_id=candidate_id,
        attempt_id=latest_attempt.id if latest_attempt else None,
        questions=questions,
        pathway=pathway,
    )

    return {
        "interview_id": interview["id"],
        "candidate_id": candidate_id,
        "pathway": pathway,
        "status": interview["status"],
        "question_count": len(questions),
        "questions": questions,
    }


@router.get("/attempts/{attempt_id}")
def get_attempt(attempt_id: str):
    interview = get_interview(attempt_id)

    if not interview:
        raise HTTPException(
            status_code=404,
            detail="Interview attempt not found.",
        )

    return interview


@router.post("/attempts/{attempt_id}/submit")
def submit_answer(
    attempt_id: str,
    request: AnswerRequest,
):
    interview = get_interview(attempt_id)

    if not interview:
        raise HTTPException(
            status_code=404,
            detail="Interview attempt not found.",
        )

    if interview.get("status") != "in_progress":
        raise HTTPException(
            status_code=400,
            detail="This interview is no longer accepting answers.",
        )

    question = next(
        (
            item
            for item in interview.get("questions", [])
            if item.get("question_id") == request.question_id
        ),
        None,
    )

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question does not belong to this interview.",
        )

    existing_answers = interview.get("answers", [])

    if any(
        answer.get("question_id") == request.question_id
        for answer in existing_answers
    ):
        raise HTTPException(
            status_code=409,
            detail="An answer for this question has already been submitted.",
        )

    answer_text = request.answer.strip()

    if not answer_text:
        raise HTTPException(
            status_code=400,
            detail="Answer cannot be empty.",
        )

    # 1. Evaluate the qualitative response with the LLM.
    evaluation = evaluate_interview_answer(
        question=question,
        answer=answer_text,
    )

    # 2. Convert the response into a new immutable evidence record.
    evidence = build_interview_evidence(
        candidate_id=interview["candidate_id"],
        question=question,
        answer=answer_text,
        evaluation=evaluation,
        pathway=interview.get("pathway"),
        attempt_id=attempt_id,
    )

    save_evidence(evidence)

    # 3. Store the answer in the interview session.
    updated = add_answer(
        interview_id=attempt_id,
        question_id=request.question_id,
        answer=answer_text,
    )

    if not updated:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found.",
        )

    answered_count = len(updated.get("answers", []))
    total_questions = len(updated.get("questions", []))

    # Auto complete if all questions are answered
    if answered_count >= total_questions:
        complete_interview(attempt_id)
        updated["status"] = "completed"

    return {
        "interview_id": attempt_id,
        "question_id": request.question_id,
        "status": updated.get("status"),
        "answered_count": answered_count,
        "question_count": total_questions,
        "remaining_questions": max(
            total_questions - answered_count,
            0,
        ),
        "evaluation": evaluation,
        "evidence": evidence.model_dump(mode="json"),
    }
