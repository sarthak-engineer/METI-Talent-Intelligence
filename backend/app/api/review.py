from datetime import datetime, timezone
from typing import List, Optional, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from app.scoring.review_store import (
    get_candidate_review_decisions,
    save_review_decision,
    _load_store as load_review_store
)
from app.scoring.analysis_store import (
    get_saved_analysis,
    save_analysis,
    _load_store as load_analysis_store
)
from app.evidence.store import save_evidence
from app.models.schemas import EvidenceItem, EvidenceType, ReviewDecision

router = APIRouter(prefix="/review", tags=["Review"])

class ReviewDecisionRequest(BaseModel):
    decision: str
    reviewer_id: str
    notes: Optional[str] = None
    adjustments: Optional[List[dict]] = None

@router.get("/queue")
def get_review_queue():
    """
    Returns a list of pending reviews with high-level snapshot data.
    Ensures exact candidate_id and analysis_snapshot_id data integrity.
    """
    reviews = load_review_store()
    
    # Get the latest review decision for each candidate
    latest_reviews = {}
    for r in reviews:
        cid = r.get("candidate_id")
        if not cid:
            continue
        # Filter out old demo candidate IDs from runtime queue
        if cid.startswith("qa-candidate-"):
            continue

        if r.get("review_required") and r.get("status") == "pending":
            latest_reviews[cid] = r
        elif cid in latest_reviews and r.get("status") != "pending":
            del latest_reviews[cid]

    queue = []
    snapshots = load_analysis_store()
    snapshot_map = {}
    for s in snapshots:
        sid = s.get("snapshot_id") or s.get("id")
        if sid:
            snapshot_map[sid] = s
    
    for r in latest_reviews.values():
        cid = r.get("candidate_id")
        sid = r.get("analysis_snapshot_id")
        
        # Enforce exact snapshot resolution & candidate_id matching
        snapshot = snapshot_map.get(sid)
        if not snapshot or snapshot.get("candidate_id") != cid:
            # Skip invalid or mismatched snapshot relationships
            continue

        queue.append({
            "candidate_id": cid,
            "analysis_snapshot_id": sid,
            "status": r.get("status"),
            "reasons": r.get("reasons", []),
            "created_at": r.get("created_at"),
            "cci": snapshot.get("cci", 0),
            "evidence_confidence": snapshot.get("evidence_confidence", 0),
        })

    # Sort by created_at descending
    queue.sort(key=lambda x: x["created_at"], reverse=True)
    return queue

@router.get("/{candidate_id}")
def get_candidate_review(candidate_id: str, snapshot_id: Optional[str] = None):
    """
    Returns the review decision and its associated snapshot for a candidate.
    Enforces candidate_id and analysis_snapshot_id integrity.
    """
    decisions = get_candidate_review_decisions(candidate_id)
    if not decisions:
        raise HTTPException(status_code=404, detail="No reviews found for this candidate.")
    
    # Target specific snapshot_id if provided, otherwise latest
    target_decision = None
    if snapshot_id:
        for d in reversed(decisions):
            if d.analysis_snapshot_id == snapshot_id:
                target_decision = d
                break
    if not target_decision:
        target_decision = decisions[-1]

    target_sid = target_decision.analysis_snapshot_id
    snapshots = load_analysis_store()
    snapshot = next(
        (s for s in reversed(snapshots) if (s.get("snapshot_id") == target_sid or s.get("id") == target_sid)),
        None
    )
    
    if not snapshot:
        snapshot = get_saved_analysis(candidate_id)

    if not snapshot:
        raise HTTPException(status_code=404, detail="Analysis snapshot not found.")

    if snapshot.get("candidate_id") != candidate_id:
        raise HTTPException(
            status_code=409,
            detail=f"Data integrity error: Review candidate_id '{candidate_id}' does not match AnalysisSnapshot candidate_id '{snapshot.get('candidate_id')}'."
        )
        
    return {
        "review": target_decision.model_dump(mode="json"),
        "snapshot": snapshot
    }

@router.post("/{review_id}/decision")
def submit_review_decision(review_id: str, payload: ReviewDecisionRequest):
    # Find the review
    all_reviews = load_review_store()
    original_review_data = None
    for r in reversed(all_reviews):
        if r.get("id") == review_id:
            original_review_data = r
            break
            
    if not original_review_data:
        raise HTTPException(status_code=404, detail="Review not found.")
        
    candidate_id = original_review_data["candidate_id"]
    snapshot_id = original_review_data["analysis_snapshot_id"]
    
    if payload.decision not in ["APPROVE", "ADJUST", "REQUEST_MORE_EVIDENCE"]:
        raise HTTPException(status_code=400, detail="Invalid decision.")
        
    if payload.decision in ["ADJUST", "REQUEST_MORE_EVIDENCE"] and not payload.notes:
        raise HTTPException(status_code=400, detail="Notes are required for adjustments or requesting evidence.")

    status_map = {
        "APPROVE": "approved",
        "ADJUST": "adjusted",
        "REQUEST_MORE_EVIDENCE": "more_evidence_requested"
    }

    # Create new decision record
    new_decision = ReviewDecision(
        id=original_review_data["id"],
        candidate_id=candidate_id,
        analysis_snapshot_id=snapshot_id,
        review_required=original_review_data["review_required"],
        reasons=original_review_data.get("reasons", []),
        status=status_map[payload.decision],
        reviewer_id=payload.reviewer_id,
        reviewer_notes=payload.notes,
        created_at=original_review_data["created_at"],
        reviewed_at=datetime.now(timezone.utc)
    )

    if payload.decision == "ADJUST" and payload.adjustments:
        # Get original snapshot
        snapshots = load_analysis_store()
        original_snapshot = None
        for s in reversed(snapshots):
            if s.get("snapshot_id") == snapshot_id or s.get("id") == snapshot_id:
                original_snapshot = dict(s)
                break
                
        if not original_snapshot:
            raise HTTPException(status_code=404, detail="Original snapshot not found.")

        # Validate adjustments
        for adj in payload.adjustments:
            score = adj.get("score")
            conf = adj.get("confidence")
            if score is not None and (score < 0 or score > 100):
                raise HTTPException(status_code=400, detail="Invalid score")
            if conf is not None and (conf < 0 or conf > 1):
                raise HTTPException(status_code=400, detail="Invalid confidence")

        # Mutate evaluations on a clone
        evals = original_snapshot.get("evaluations", [])
        for adj in payload.adjustments:
            comp_id = adj.get("competency_id")
            for i, ev in enumerate(evals):
                if ev.get("competency_id") == comp_id:
                    previous_score = ev.get("score")
                    new_score = adj.get("score", previous_score)
                    
                    ev["score"] = new_score
                    ev["confidence"] = adj.get("confidence", ev.get("confidence"))
                    if "rationale" in adj:
                        ev["rationale"] = adj["rationale"]
                    if "strengths" in adj:
                        ev["strengths"] = adj["strengths"]
                    if "gaps" in adj:
                        ev["gaps"] = adj["gaps"]
                    
                    # Create HUMAN_REVIEW evidence
                    evidence = EvidenceItem(
                        id=f"EV-REV-{candidate_id}-{comp_id}-{int(datetime.now(timezone.utc).timestamp())}",
                        candidate_id=candidate_id,
                        source=f"Assessor {payload.reviewer_id}",
                        evidence_type=EvidenceType.HUMAN_REVIEW,
                        text=f"AI Score: {previous_score} -> Human Score: {new_score}. Notes: {payload.notes}",
                        competency_ids=[comp_id],
                        confidence=0.95,
                        created_at=datetime.now(timezone.utc)
                    )
                    save_evidence(evidence)
                    ev["evidence_ids"].append(evidence.id)
                    break
        
        # Save new snapshot version
        original_snapshot["id"] = f"{snapshot_id}-reviewed"
        original_snapshot["snapshot_id"] = f"{snapshot_id}-reviewed"
        original_snapshot["analysis_version"] = "snapshot-1.0-reviewed"
        original_snapshot["review_decision"] = new_decision.model_dump(mode="json")
        save_analysis(candidate_id, original_snapshot)
        
        # Link new snapshot to new decision
        new_decision.analysis_snapshot_id = original_snapshot["id"]

    save_review_decision(new_decision)
    return {"status": "success", "decision": new_decision.model_dump(mode="json")}
