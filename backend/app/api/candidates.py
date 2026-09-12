from fastapi import APIRouter, HTTPException
from typing import List

from app.models.schemas import CandidateProfile
from app.scoring.candidate_store import (
    save_candidate,
    get_candidate,
    list_candidates,
)

router = APIRouter(prefix="/candidates", tags=["Candidates"])


@router.post("", response_model=CandidateProfile)
def create_or_update_candidate(profile: CandidateProfile):
    """
    Create or update a candidate profile.
    """
    if not profile.candidate_id or not profile.full_name or not profile.email:
        raise HTTPException(
            status_code=400,
            detail="candidate_id, full_name, and email are required.",
        )
    return save_candidate(profile)


@router.get("/{candidate_id}", response_model=CandidateProfile)
def get_candidate_by_id(candidate_id: str):
    """
    Retrieve candidate profile by ID.
    """
    candidate = get_candidate(candidate_id)
    if not candidate:
        raise HTTPException(
            status_code=404,
            detail=f"Candidate {candidate_id} not found.",
        )
    return candidate


@router.get("", response_model=List[CandidateProfile])
def get_all_candidates():
    """
    Retrieve all candidate profiles.
    """
    return list_candidates()
