import json
from pathlib import Path
from typing import List, Optional

from app.models.schemas import ReviewDecision


STORE_PATH = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "review_decisions.json"
)


def _load_store() -> List[dict]:
    if not STORE_PATH.exists():
        return []

    try:
        content = STORE_PATH.read_text(
            encoding="utf-8"
        )

        if not content.strip():
            return []

        data = json.loads(content)

        if isinstance(data, list):
            return data

        return []

    except (json.JSONDecodeError, OSError):
        return []


def _save_store(data: List[dict]) -> None:
    STORE_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    temp_path = STORE_PATH.with_suffix(".tmp")

    temp_path.write_text(
        json.dumps(data, indent=2),
        encoding="utf-8",
    )

    temp_path.replace(STORE_PATH)


def save_review_decision(
    decision: ReviewDecision,
) -> ReviewDecision:
    """
    Persist a review decision.

    A decision is tied to one immutable analysis snapshot.
    """

    store = _load_store()

    store.append(
        decision.model_dump(mode="json")
    )

    _save_store(store)

    return decision


def get_review_decision(
    analysis_snapshot_id: str,
) -> Optional[ReviewDecision]:
    store = _load_store()

    for item in reversed(store):
        if (
            item.get("analysis_snapshot_id")
            == analysis_snapshot_id
        ):
            return ReviewDecision(**item)

    return None


def get_candidate_review_decisions(
    candidate_id: str,
) -> List[ReviewDecision]:
    store = _load_store()

    return [
        ReviewDecision(**item)
        for item in store
        if item.get("candidate_id") == candidate_id
    ]
