from fastapi import APIRouter, HTTPException

from app.evidence.store import get_candidate_evidence
from app.evidence.confidence import EVIDENCE_CONFIDENCE

router = APIRouter(prefix="/evidence", tags=["Evidence"])


@router.get("/config/weights")
def get_evidence_weights():
    return {
        k.value: v for k, v in EVIDENCE_CONFIDENCE.items()
    }


@router.get("/{candidate_id}")
def get_evidence(candidate_id: str):
    """
    Return the evidence records supporting a candidate's analysis.

    This endpoint exposes source evidence separately from the LLM's
    interpretation so the UI can provide evidence traceability.
    """

    evidence = get_candidate_evidence(candidate_id)

    if not evidence:
        raise HTTPException(
            status_code=404,
            detail="No evidence found for this candidate.",
        )

    return {
        "candidate_id": candidate_id,
        "evidence": [
            item.model_dump(mode="json")
            for item in evidence
        ],
    }
