import json
from pathlib import Path
from typing import Optional, List
from datetime import datetime, timezone

from app.models.schemas import CandidateProfile


STORE_PATH = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "candidates.json"
)


def _load_store() -> List[dict]:
    if not STORE_PATH.exists():
        return []

    try:
        content = STORE_PATH.read_text(encoding="utf-8")
        if not content.strip():
            return []
        data = json.loads(content)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def _save_store(data: List[dict]) -> None:
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    temp_path = STORE_PATH.with_suffix(".tmp")
    temp_path.write_text(
        json.dumps(data, indent=2, default=str),
        encoding="utf-8",
    )
    temp_path.replace(STORE_PATH)


def save_candidate(profile: CandidateProfile) -> CandidateProfile:
    """
    Save or update candidate profile in candidates.json.
    """
    store = _load_store()

    # Check if candidate already exists
    updated = False
    for i, item in enumerate(store):
        if item.get("candidate_id") == profile.candidate_id:
            store[i] = profile.model_dump(mode="json")
            updated = True
            break

    if not updated:
        store.append(profile.model_dump(mode="json"))

    _save_store(store)
    return profile


def get_candidate(candidate_id: str) -> Optional[CandidateProfile]:
    """
    Get candidate profile by candidate_id.
    """
    store = _load_store()
    for item in reversed(store):
        if item.get("candidate_id") == candidate_id:
            return CandidateProfile(**item)
    return None


def list_candidates() -> List[CandidateProfile]:
    """
    List all persisted candidate profiles.
    """
    store = _load_store()
    return [CandidateProfile(**item) for item in store]
