from datetime import datetime, timezone
from typing import List, Optional

from app.models.schemas import ReviewDecision, ReviewReason


LOW_EVIDENCE_CONFIDENCE_THRESHOLD = 0.45


def evaluate_review_gate(
    candidate_id: str,
    analysis_snapshot_id: str,
    evidence_confidence: float,
    consistency_status: str,
    client_facing_ready: bool = False,
    critical_flags: Optional[List[str]] = None,
) -> ReviewDecision:
    """
    Determine whether human review is required.

    Review is triggered only by meaningful oversight conditions.

    Evidence gaps alone do not automatically require human review.
    """

    reasons: List[ReviewReason] = []

    critical_flags = critical_flags or []

    # 1. Evidence confidence is too low.
    if evidence_confidence < LOW_EVIDENCE_CONFIDENCE_THRESHOLD:
        reasons.append(
            ReviewReason.LOW_EVIDENCE_CONFIDENCE
        )

    # 2. Actual contradiction detected.
    #
    # "evidence_gaps" is intentionally NOT treated as a conflict.
    if consistency_status == "review_required":
        reasons.append(
            ReviewReason.INTEGRITY_CONFLICT
        )

    # 3. Critical evaluation flags.
    if critical_flags:
        reasons.append(
            ReviewReason.CRITICAL_FLAG
        )

    # 4. Candidate is being considered client-facing ready.
    #
    # This signal is supplied by the role/readiness layer.
    if client_facing_ready:
        reasons.append(
            ReviewReason.CLIENT_FACING_ROLE
        )

    return ReviewDecision(
        id=f"REV-{candidate_id}-{analysis_snapshot_id}",
        candidate_id=candidate_id,
        analysis_snapshot_id=analysis_snapshot_id,
        review_required=bool(reasons),
        reasons=reasons,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
