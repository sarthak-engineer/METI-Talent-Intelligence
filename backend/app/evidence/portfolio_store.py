import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from app.models.schemas import ClaimEvidence


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
STORE_FILE = DATA_DIR / "portfolio_intelligence.json"


def _ensure_store():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not STORE_FILE.exists():
        STORE_FILE.write_text("[]", encoding="utf-8")


def save_portfolio_intelligence(
    candidate_id: str,
    claim_evidence_matrix: List[ClaimEvidence],
    attempt_id: Optional[str] = None,
) -> dict:

    _ensure_store()

    try:
        records = json.loads(
            STORE_FILE.read_text(encoding="utf-8")
        )
    except (json.JSONDecodeError, OSError):
        records = []

    record = {
        "id": (
            f"PEI-{candidate_id}-"
            f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}"
        ),
        "candidate_id": candidate_id,
        "attempt_id": attempt_id,
        "synthesis_version": "portfolio-synthesis-v1.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "claim_evidence_matrix": [
            item.model_dump()
            for item in claim_evidence_matrix
        ],
    }

    records.append(record)

    STORE_FILE.write_text(
        json.dumps(records, indent=2),
        encoding="utf-8",
    )

    return record


def get_latest_portfolio_intelligence(
    candidate_id: str,
) -> Optional[dict]:

    _ensure_store()

    try:
        records = json.loads(
            STORE_FILE.read_text(encoding="utf-8")
        )
    except (json.JSONDecodeError, OSError):
        return None

    candidate_records = [
        record
        for record in records
        if record.get("candidate_id") == candidate_id
    ]

    if not candidate_records:
        return None

    return candidate_records[-1]


def get_portfolio_intelligence_history(
    candidate_id: str,
) -> List[dict]:

    _ensure_store()

    try:
        records = json.loads(
            STORE_FILE.read_text(encoding="utf-8")
        )
    except (json.JSONDecodeError, OSError):
        return []

    return [
        record
        for record in records
        if record.get("candidate_id") == candidate_id
    ]
