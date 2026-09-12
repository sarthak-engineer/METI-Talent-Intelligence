import pytest
from unittest.mock import MagicMock
from app.api.case import _case_attempts
from app.case.definitions import get_case_by_role, get_case_by_id
from app.models.schemas import EvidenceType
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_case_by_role():
    case = get_case_by_role("role-ai-transformation-consultant")
    assert case is not None
    assert case.role_id == "role-ai-transformation-consultant"
    assert "C12" in case.expected_competency_ids

def test_case_selection_api():
    response = client.get("/api/case/?pathway=role-business-technology-consultant")
    assert response.status_code == 200
    data = response.json()
    assert data["role_id"] == "role-business-technology-consultant"
    assert data["case_id"] == "case-bus-tech-01"

def test_start_case_attempt():
    response = client.post("/api/case/attempts?candidate_id=CAND-123&case_id=case-ai-ml-01")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "in_progress"
    assert data["case_id"] == "case-ai-ml-01"
    assert "attempt_id" in data
    
    # Check attempt is retrieved
    attempt_id = data["attempt_id"]
    get_response = client.get(f"/api/case/attempts/{attempt_id}")
    assert get_response.status_code == 200
    assert get_response.json()["attempt_id"] == attempt_id

def test_submit_case_creates_evidence_and_evaluates(monkeypatch):
    # Mock existing evidence so validation passes
    monkeypatch.setattr("app.api.case.get_candidate_evidence", lambda cid: [{"id": "ev1"}])
    
    # Mock save_evidence to capture evidence
    saved_evidence = []
    monkeypatch.setattr("app.api.case.save_evidence", lambda ev: saved_evidence.append(ev))
    
    # Mock CaseEvaluatorAgent
    mock_evaluator_instance = MagicMock()
    mock_evaluator_instance.evaluate.return_value = {
        "evaluations": [
            {
                "competency_id": "C13",
                "score": 75,
                "confidence": 0.8,
                "strengths": ["Structured problem well"],
                "gaps": [],
                "flags": [],
                "rationale": "Clear root cause hypothesis",
                "evidence_summary": ["Mentions specific metrics"]
            }
        ],
        "overall_summary": "Strong analytical approach.",
        "recommended_follow_up": []
    }
    
    # Mock the class instantiation to return our mock instance
    mock_evaluator_class = MagicMock(return_value=mock_evaluator_instance)
    monkeypatch.setattr("app.api.case.CaseEvaluatorAgent", mock_evaluator_class)
    
    # Start attempt
    post_res = client.post("/api/case/attempts?candidate_id=CAND-123&case_id=case-ai-ml-01")
    attempt_id = post_res.json()["attempt_id"]
    
    # Submit attempt
    submit_data = {
        "candidate_response": "This is a sufficiently long response to pass the min_length requirement of twenty characters."
    }
    submit_res = client.post(f"/api/case/attempts/{attempt_id}/submit", json=submit_data)
    
    assert submit_res.status_code == 200
    resp_data = submit_res.json()
    
    # Check evidence was created and saved
    assert len(saved_evidence) == 1
    evidence = saved_evidence[0]
    assert evidence.candidate_id == "CAND-123"
    assert evidence.evidence_type == EvidenceType.CASE_WORK_SAMPLE
    # Check provenance
    assert evidence.attempt_id == attempt_id
    assert evidence.question_id == "case-ai-ml-01"
    
    # Check evaluation is returned
    assert "evaluation" in resp_data
    assert resp_data["evaluation"]["evaluations"][0]["score"] == 75
    
    # Check CaseEvaluatorAgent was called with correct dynamic rubric
    mock_evaluator_instance.evaluate.assert_called_once()
    kwargs = mock_evaluator_instance.evaluate.call_args.kwargs
    assert kwargs["expected_competency_ids"] == ["C13", "C08", "C14", "C02", "C15"]
    assert len(kwargs["evaluation_rubric"]) == 5

def test_submit_without_evidence_fails(monkeypatch):
    monkeypatch.setattr("app.api.case.get_candidate_evidence", lambda cid: [])
    
    post_res = client.post("/api/case/attempts?candidate_id=CAND-123&case_id=case-ai-ml-01")
    attempt_id = post_res.json()["attempt_id"]
    
    submit_data = {
        "candidate_response": "This is a sufficiently long response to pass the min_length requirement of twenty characters."
    }
    submit_res = client.post(f"/api/case/attempts/{attempt_id}/submit", json=submit_data)
    
    assert submit_res.status_code == 404
    assert "no existing evidence" in submit_res.json()["detail"].lower()
