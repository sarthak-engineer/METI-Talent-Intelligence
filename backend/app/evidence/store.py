import json
from pathlib import Path
from typing import List

from app.models.schemas import EvidenceItem


DATA_DIR = Path(__file__).resolve().parents[2] / "data"
EVIDENCE_FILE = DATA_DIR / "evidence.json"


def _ensure_store():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not EVIDENCE_FILE.exists():
        EVIDENCE_FILE.write_text("[]", encoding="utf-8")


def save_evidence(evidence: EvidenceItem) -> EvidenceItem:
    _ensure_store()

    existing = json.loads(
        EVIDENCE_FILE.read_text(encoding="utf-8")
    )

    existing.append(evidence.model_dump(mode="json"))

    EVIDENCE_FILE.write_text(
        json.dumps(existing, indent=2),
        encoding="utf-8",
    )

    return evidence


def get_candidate_evidence(candidate_id: str) -> List[EvidenceItem]:
    _ensure_store()

    existing = json.loads(
        EVIDENCE_FILE.read_text(encoding="utf-8")
    )

    return [
        EvidenceItem(**item)
        for item in existing
        if item["candidate_id"] == candidate_id
    ]


def get_candidate_evidence_for_all_candidates() -> List[EvidenceItem]:
    _ensure_store()

    existing = json.loads(
        EVIDENCE_FILE.read_text(encoding="utf-8")
    )

    return [
        EvidenceItem(**item)
        for item in existing
    ]


def get_evidence_by_ids(evidence_ids: list[str]) -> list[EvidenceItem]:
    """
    Return evidence records for the supplied evidence IDs.
    """
    all_evidence = get_candidate_evidence_for_all_candidates()

    evidence_map = {
        evidence.id: evidence
        for evidence in all_evidence
    }

    return [
        evidence_map[evidence_id]
        for evidence_id in evidence_ids
        if evidence_id in evidence_map
    ]


def update_evidence_competency_ids(
    evidence_to_competencies: dict[str, list[str]],
) -> None:
    """
    Merge competency mappings into existing evidence records.

    Existing competency mappings are preserved and new mappings
    are deduplicated. The evidence store is updated in one write.
    """
    _ensure_store()

    existing = json.loads(
        EVIDENCE_FILE.read_text(encoding="utf-8")
    )

    for item in existing:
        evidence_id = item.get("id")

        if evidence_id not in evidence_to_competencies:
            continue

        existing_ids = set(
            item.get("competency_ids", [])
        )

        new_ids = set(
            evidence_to_competencies[evidence_id]
        )

        item["competency_ids"] = sorted(
            existing_ids | new_ids
        )

    EVIDENCE_FILE.write_text(
        json.dumps(existing, indent=2),
        encoding="utf-8",
    )
