from fastapi import APIRouter, HTTPException

from app.scoring.analysis_store import get_saved_analysis
from app.scoring.entitlement_store import (
    create_default_entitlement,
    get_entitlement,
)
from app.reports.report_generator import (
    generate_summary,
    generate_detailed_report,
)


router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
)


@router.get("/{candidate_id}")
def get_candidate_report(candidate_id: str):
    """
    Return the candidate's latest report.

    Summary findings are always available.

    Detailed report is returned only when the candidate has
    detailed_report_access.

    The report is generated from the latest immutable
    analysis snapshot. No LLM call is made here.
    """

    analysis = get_saved_analysis(
        candidate_id
    )

    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Complete diagnosis first to generate your report.",
        )

    entitlement = get_entitlement(
        candidate_id
    )

    if not entitlement:
        entitlement = create_default_entitlement(
            candidate_id
        )

    summary = generate_summary(
        analysis
    )

    response = {
        "candidate_id": candidate_id,
        "snapshot_id": analysis.get(
            "snapshot_id"
        ),
        "attempt_id": analysis.get(
            "attempt_id"
        ),
        "entitlement": {
            "summary_access": (
                entitlement.summary_access
            ),
            "detailed_report_access": (
                entitlement.detailed_report_access
            ),
        },
        "summary": summary,
        "detailed_report": None,
    }

    if entitlement.detailed_report_access:

        response["detailed_report"] = (
            generate_detailed_report(
                analysis
            )
        )

    return response
