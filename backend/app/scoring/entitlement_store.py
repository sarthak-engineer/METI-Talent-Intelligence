import json
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone

from app.models.schemas import Entitlement


STORE_PATH = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "entitlements.json"
)


def _load_store() -> list[dict]:
    if not STORE_PATH.exists():
        return []

    try:
        content = STORE_PATH.read_text(
            encoding="utf-8"
        )

        if not content.strip():
            return []

        data = json.loads(content)

        return data if isinstance(data, list) else []

    except (json.JSONDecodeError, OSError):
        return []


def _save_store(data: list[dict]) -> None:
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


def get_entitlement(
    candidate_id: str,
) -> Optional[Entitlement]:
    store = _load_store()

    for item in reversed(store):
        if item.get("candidate_id") == candidate_id:
            return Entitlement(**item)

    return None


def create_default_entitlement(
    candidate_id: str,
) -> Entitlement:
    """
    Create the default commercial state.

    Summary is always available.
    Detailed report requires an upgrade.
    """

    existing = get_entitlement(candidate_id)

    if existing:
        return existing

    entitlement = Entitlement(
        candidate_id=candidate_id,
        summary_access=True,
        detailed_report_access=False,
        product_version="v1.0",
        updated_at=datetime.now(timezone.utc),
    )

    store = _load_store()

    store.append(
        entitlement.model_dump(mode="json")
    )

    _save_store(store)

    return entitlement


def upgrade_to_detailed_report(
    candidate_id: str,
) -> Entitlement:
    """
    Mock upgrade for the hackathon.

    No real payment is processed.
    """

    existing = get_entitlement(candidate_id)

    if existing:
        entitlement = existing.model_copy(
            update={
                "detailed_report_access": True,
                "updated_at": datetime.now(
                    timezone.utc
                ),
            }
        )
    else:
        entitlement = Entitlement(
            candidate_id=candidate_id,
            summary_access=True,
            detailed_report_access=True,
            product_version="v1.0",
            updated_at=datetime.now(timezone.utc),
        )

    store = _load_store()

    store.append(
        entitlement.model_dump(mode="json")
    )

    _save_store(store)

    return entitlement
