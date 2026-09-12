from fastapi import APIRouter
from app.scoring.entitlement_store import (
    create_default_entitlement,
    get_entitlement,
    upgrade_to_detailed_report,
)

router = APIRouter(prefix="/entitlements", tags=["Entitlements"])


@router.get("/{candidate_id}")
def get_candidate_entitlement(candidate_id: str):
    entitlement = get_entitlement(candidate_id)

    if not entitlement:
        entitlement = create_default_entitlement(candidate_id)

    return entitlement


@router.post("/{candidate_id}/upgrade")
def upgrade_candidate(candidate_id: str):
    return upgrade_to_detailed_report(candidate_id)
