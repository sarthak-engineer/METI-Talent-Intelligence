import json
from pathlib import Path
from typing import Any, Optional


STORE_PATH = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "analysis_snapshots.json"
)


def _load_store() -> list[dict]:
    if not STORE_PATH.exists():
        return []

    try:
        content = STORE_PATH.read_text(encoding="utf-8")

        if not content.strip():
            return []

        data = json.loads(content)

        # New snapshot format.
        if isinstance(data, list):
            return data

        # Backward compatibility with the old
        # candidate_id -> analysis format.
        if isinstance(data, dict):
            snapshots = []

            for candidate_id, analysis in data.items():
                analysis_copy = dict(analysis)
                analysis_copy.setdefault(
                    "candidate_id",
                    candidate_id,
                )
                analysis_copy.setdefault(
                    "snapshot_id",
                    f"legacy-{candidate_id}",
                )
                snapshots.append(analysis_copy)

            return snapshots

        return []

    except (json.JSONDecodeError, OSError):
        return []


def _save_store(data: list[dict]) -> None:
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)

    temp_path = STORE_PATH.with_suffix(".tmp")

    temp_path.write_text(
        json.dumps(data, indent=2),
        encoding="utf-8",
    )

    temp_path.replace(STORE_PATH)


def save_analysis(
    candidate_id: str,
    analysis: dict[str, Any],
) -> dict[str, Any]:
    """
    Persist a new immutable analysis snapshot.

    Existing snapshots are never overwritten.
    """

    store = _load_store()

    analysis_copy = dict(analysis)
    analysis_copy.setdefault(
        "candidate_id",
        candidate_id,
    )

    store.append(analysis_copy)

    _save_store(store)

    return analysis_copy


def get_saved_analysis(
    candidate_id: str,
) -> Optional[dict[str, Any]]:
    """
    Return the latest analysis snapshot for a candidate.
    """

    store = _load_store()

    candidate_snapshots = [
        snapshot
        for snapshot in store
        if snapshot.get("candidate_id") == candidate_id
    ]

    if not candidate_snapshots:
        return None

    return candidate_snapshots[-1]


def get_analysis_snapshots(
    candidate_id: str,
) -> list[dict[str, Any]]:
    """
    Return every analysis snapshot for a candidate,
    oldest first.
    """

    store = _load_store()

    return [
        snapshot
        for snapshot in store
        if snapshot.get("candidate_id") == candidate_id
    ]
