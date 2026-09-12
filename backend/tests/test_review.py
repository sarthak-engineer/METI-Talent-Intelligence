import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.schemas import ReviewDecision, ReviewReason
from app.scoring.review_store import save_review_decision
from app.scoring.analysis_store import save_analysis
from app.evidence.store import get_candidate_evidence
from app.scoring.review_gate import evaluate_review_gate

client = TestClient(app)

def test_review_lifecycle():
    candidate_id = "test-candidate-review"
    snapshot_id = "test-snapshot-1"
    mock_snapshot = {
        "id": snapshot_id,
        "candidate_id": candidate_id,
        "attempt_id": "attempt-1",
        "evaluations": [
            {
                "competency_id": "C01",
                "score": 50.0,
                "confidence": 0.4,
                "evidence_ids": [],
                "rationale": "Initial AI score",
                "strengths": [],
                "gaps": [],
                "flags": []
            }
        ],
        "cci": 65.0,
        "evidence_coverage": 0.5,
        "evidence_confidence": 0.4,
        "created_at": "2026-09-12T00:00:00Z"
    }
    save_analysis(candidate_id, mock_snapshot)
    
    mock_decision = ReviewDecision(
        id=f"REV-{candidate_id}-{snapshot_id}",
        candidate_id=candidate_id,
        analysis_snapshot_id=snapshot_id,
        review_required=True,
        reasons=[ReviewReason.LOW_EVIDENCE_CONFIDENCE],
        status="pending",
        created_at="2026-09-12T00:01:00Z"
    )
    save_review_decision(mock_decision)
    
    q_resp = client.get("/api/review/queue")
    assert q_resp.status_code == 200
    queue_data = q_resp.json()
    assert len(queue_data) > 0
    found_in_queue = next((item for item in queue_data if item["candidate_id"] == candidate_id), None)
    assert found_in_queue is not None
    assert found_in_queue["status"] == "pending"
    assert found_in_queue["cci"] == 65.0
    
    c_resp = client.get(f"/api/review/{candidate_id}")
    assert c_resp.status_code == 200
    candidate_review_data = c_resp.json()
    assert candidate_review_data["review"]["status"] == "pending"
    assert candidate_review_data["snapshot"]["id"] == snapshot_id
    
    adjust_payload = {
        "decision": "ADJUST",
        "reviewer_id": "Assessor-X",
        "notes": "Evidence from interview was stronger than initially captured.",
        "adjustments": [
            {
                "competency_id": "C01",
                "score": 75.0,
                "confidence": 0.9,
                "rationale": "Adjusted due to interview evidence"
            }
        ]
    }
    a_resp = client.post(f"/api/review/{mock_decision.id}/decision", json=adjust_payload)
    assert a_resp.status_code == 200
    a_data = a_resp.json()
    assert a_data["status"] == "success"
    assert a_data["decision"]["status"] == "adjusted"
    
    new_snapshot_id = a_data["decision"]["analysis_snapshot_id"]
    assert new_snapshot_id == f"{snapshot_id}-reviewed"
    
    c2_resp = client.get(f"/api/review/{candidate_id}")
    c2_data = c2_resp.json()
    assert c2_data["snapshot"]["id"] == new_snapshot_id
    evals = c2_data["snapshot"]["evaluations"]
    assert len(evals) == 1
    assert evals[0]["score"] == 75.0
    assert evals[0]["confidence"] == 0.9
    assert evals[0]["rationale"] == "Adjusted due to interview evidence"
    
    evidence = get_candidate_evidence(candidate_id)
    human_evidence = [e for e in evidence if e.evidence_type == "human_review"]
    assert len(human_evidence) >= 1
    assert human_evidence[-1].confidence == 0.95
    assert "Human Score: 75" in human_evidence[-1].text

def test_review_gate_reasons():
    # A. Client-facing role -> review_required = true -> CLIENT_FACING_ROLE present -> status = pending
    decision = evaluate_review_gate(
        candidate_id="c-1",
        analysis_snapshot_id="s-1",
        evidence_confidence=0.8,
        consistency_status="ok",
        client_facing_ready=True,
        critical_flags=None
    )
    assert decision.review_required is True
    assert decision.status == "pending"
    assert ReviewReason.CLIENT_FACING_ROLE in decision.reasons

    # B. Non-client-facing role -> does not automatically trigger CLIENT_FACING_ROLE
    decision2 = evaluate_review_gate(
        candidate_id="c-2",
        analysis_snapshot_id="s-2",
        evidence_confidence=0.8,
        consistency_status="ok",
        client_facing_ready=False,
        critical_flags=None
    )
    assert decision2.review_required is False
    assert ReviewReason.CLIENT_FACING_ROLE not in decision2.reasons

    # C. Critical flag -> CRITICAL_FLAG preserved
    decision3 = evaluate_review_gate(
        candidate_id="c-3",
        analysis_snapshot_id="s-3",
        evidence_confidence=0.8,
        consistency_status="ok",
        client_facing_ready=False,
        critical_flags=["flag1"]
    )
    assert decision3.review_required is True
    assert ReviewReason.CRITICAL_FLAG in decision3.reasons

    # D. Low evidence confidence -> LOW_EVIDENCE_CONFIDENCE preserved
    decision4 = evaluate_review_gate(
        candidate_id="c-4",
        analysis_snapshot_id="s-4",
        evidence_confidence=0.2, # below threshold
        consistency_status="ok",
        client_facing_ready=False,
        critical_flags=None
    )
    assert decision4.review_required is True
    assert ReviewReason.LOW_EVIDENCE_CONFIDENCE in decision4.reasons

def test_reports_with_review_status():
    # E, F, G: Check report API output with review status
    candidate_id = "test-report-candidate"
    snapshot_id = "test-report-snapshot"
    mock_snapshot = {
        "id": snapshot_id,
        "snapshot_id": snapshot_id,
        "candidate_id": candidate_id,
        "evaluations": [],
        "role_matches": [],
        "role_readiness": [],
        "review_decision": {
            "review_required": True,
            "status": "pending",
            "reasons": [ReviewReason.CLIENT_FACING_ROLE]
        }
    }
    save_analysis(candidate_id, mock_snapshot)
    
    resp = client.get(f"/api/reports/{candidate_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["summary"]["review"]["required"] is True
    assert data["summary"]["review"]["status"] == "pending"

def test_candidate_isolation_queue():
    # I. Candidate isolation
    q_resp = client.get("/api/review/queue")
    queue_data = q_resp.json()
    for item in queue_data:
        assert item["candidate_id"] != "candidate-demo-001" # J. No hardcoded candidate
        
    c1_id = "isolate-cand-1"
    c2_id = "isolate-cand-2"
    
    save_analysis(c1_id, {"snapshot_id": "s-c1", "candidate_id": c1_id})
    save_review_decision(ReviewDecision(id="r-1", candidate_id=c1_id, analysis_snapshot_id="s-c1", review_required=True, status="pending", reasons=[], created_at="2026-09-12T00:00:00Z"))
    
    save_analysis(c2_id, {"snapshot_id": "s-c2", "candidate_id": c2_id})
    save_review_decision(ReviewDecision(id="r-2", candidate_id=c2_id, analysis_snapshot_id="s-c2", review_required=True, status="pending", reasons=[], created_at="2026-09-12T00:00:00Z"))
    
    r1 = client.get(f"/api/review/{c1_id}").json()
    assert r1["review"]["candidate_id"] == c1_id
    
    r2 = client.get(f"/api/review/{c2_id}").json()
    assert r2["review"]["candidate_id"] == c2_id
