import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.evidence.store import save_evidence
from app.models.schemas import EvidenceItem, EvidenceType
from app.interview.questions import select_interview_questions, _extract_concrete_claims

client = TestClient(app)

def test_generate_interview_questions():
    response = client.get("/api/interview/questions?candidate_id=CAND-001&pathway=role-ai-transformation-consultant")
    assert response.status_code == 200
    data = response.json()
    assert "questions" in data
    assert len(data["questions"]) > 0
    # verify schema
    q = data["questions"][0]
    assert "question_id" in q
    assert "category" in q
    assert "competency_ids" in q
    assert "reason" in q
    assert "evidence_to_verify" in q
    assert "source_evidence_ids" in q
    assert "expected_signal" in q
    assert "question" in q

def test_resume_claim_produces_claim_verification():
    cid = "cand-test-claim-verification"
    ev = EvidenceItem(
        id="EV-TEST-CLAIM-001",
        candidate_id=cid,
        source="resume",
        evidence_type=EvidenceType.SELF_REPORT,
        text="Reduced model inference latency by 40% using TensorRT and vLLM acceleration pipeline.",
        competency_ids=["C08"],
        confidence=0.7,
        created_at=datetime.now(timezone.utc),
    )
    save_evidence(ev)

    questions = select_interview_questions(cid, "role-ai-transformation-consultant", [])
    claim_qs = [q for q in questions if q["category"] == "CLAIM_VERIFICATION"]
    
    assert len(claim_qs) > 0, "Resume claim must produce at least one CLAIM_VERIFICATION question"
    q = claim_qs[0]
    assert "EV-TEST-CLAIM-001" in q["source_evidence_ids"]
    assert "TensorRT" in q["evidence_to_verify"] or "inference" in q["evidence_to_verify"]
    assert "TensorRT" in q["question"] or "Reduced model" in q["question"] or "inference" in q["question"]

def test_competency_gap_produces_competency_probe():
    cid = "cand-test-gap-probe"
    evaluations = [
        {"competency_id": "C13", "score": 45.0, "confidence": 0.3, "evidence_ids": []}
    ]
    questions = select_interview_questions(cid, "role-ai-transformation-consultant", evaluations)
    probe_qs = [q for q in questions if q["category"] == "COMPETENCY_PROBE"]
    
    assert len(probe_qs) > 0, "Competency gap must produce COMPETENCY_PROBE question"
    c13_qs = [q for q in probe_qs if "C13" in q["competency_ids"]]
    assert len(c13_qs) > 0, "Should target low confidence / gap competency C13"

def test_overlapping_evidence_produces_evidence_triangulation():
    cid = "cand-test-triangulation"
    ev_resume = EvidenceItem(
        id="EV-RESUME-TRI-01",
        candidate_id=cid,
        source="resume",
        evidence_type=EvidenceType.SELF_REPORT,
        text="Implemented enterprise multi-agent platform for real-time document search.",
        competency_ids=["C08"],
        confidence=0.7,
        created_at=datetime.now(timezone.utc),
    )
    ev_case = EvidenceItem(
        id="EV-CASE-TRI-02",
        candidate_id=cid,
        source="consulting_case",
        evidence_type=EvidenceType.CASE_WORK_SAMPLE,
        text="Designed retail bank onboarding automation architecture and TOM roadmap.",
        competency_ids=["C08"],
        confidence=0.85,
        created_at=datetime.now(timezone.utc),
    )
    save_evidence(ev_resume)
    save_evidence(ev_case)

    questions = select_interview_questions(cid, "role-ai-transformation-consultant", [])
    tri_qs = [q for q in questions if q["category"] == "EVIDENCE_TRIANGULATION"]
    
    assert len(tri_qs) > 0, "Overlapping resume and case evidence must produce EVIDENCE_TRIANGULATION"
    q = tri_qs[0]
    assert "EV-RESUME-TRI-01" in q["source_evidence_ids"]
    assert "EV-CASE-TRI-02" in q["source_evidence_ids"]

def test_fabricated_claims_never_created():
    cid = "cand-test-no-resume-evidence"
    # Candidate has no evidence at all
    questions = select_interview_questions(cid, "role-ai-transformation-consultant", [])
    claim_qs = [q for q in questions if q["category"] == "CLAIM_VERIFICATION"]
    
    assert len(claim_qs) == 0, "Fabricated claims must NEVER be created if candidate has no resume evidence"
    for q in questions:
        assert q["category"] == "COMPETENCY_PROBE"

def test_submitted_evidence_preserves_provenance():
    cid = "cand-test-provenance"
    start_resp = client.post(f"/api/interview/attempts?candidate_id={cid}&pathway=role-ai-transformation-consultant")
    assert start_resp.status_code == 200
    attempt_data = start_resp.json()
    attempt_id = attempt_data["interview_id"]
    q = attempt_data["questions"][0]

    ans_resp = client.post(
        f"/api/interview/attempts/{attempt_id}/submit",
        json={"question_id": q["question_id"], "answer": "I led the enterprise architecture team through baseline measurement, pilot validation, and phased rollout."}
    )
    assert ans_resp.status_code == 200
    ans_data = ans_resp.json()
    evidence = ans_data.get("evidence")

    assert evidence is not None
    assert evidence["candidate_id"] == cid
    assert evidence["pathway"] == "role-ai-transformation-consultant"
    assert evidence["question_id"] == q["question_id"]
    assert evidence["category"] == q["category"]
    assert evidence["competency_ids"] == q["competency_ids"]
    assert evidence["confidence"] == 0.80
    assert evidence["evidence_type"] == "consulting_response"
    assert evidence["source"] == "adaptive_interview"
    assert evidence["text"].startswith("I led the enterprise architecture")


# --- NEW RELIABILITY FIX #5 TESTS ---

def test_extract_claims_pii_rejection():
    # A. Email-only
    assert _extract_concrete_claims("sarthakai.eng@gmail.com") == []
    
    # B. Phone-only
    assert _extract_concrete_claims("+91 9876543210") == []
    
    # C. GitHub URL-only
    assert _extract_concrete_claims("https://github.com/username/project") == []
    
    # D. LinkedIn URL-only
    assert _extract_concrete_claims("www.linkedin.com/in/username-12345") == []
    
    # E. Candidate ID
    assert _extract_concrete_claims("candidate-demo-001") == []
    assert _extract_concrete_claims("Candidate ID: qa-candidate-99") == []
    
    # Filenames
    assert _extract_concrete_claims("Alex_Mercer_Resume_2026.pdf") == []

def test_extract_claims_valid_project():
    # F. Valid project claim
    claims = _extract_concrete_claims("Built a Python ML pipeline to detect Parkinson's disease using multimodal data.")
    assert len(claims) == 1
    assert "Parkinson" in claims[0]
    
    # G. Valid responsibility/impact claim
    claims2 = _extract_concrete_claims("Led cross-functional team of 10 engineers, increasing throughput by 40%.")
    assert len(claims2) == 1
    assert "40%" in claims2[0]

def test_extract_claims_url_plus_valid_project():
    # J. URL + valid project description -> valid project claim retained, URL itself ignored
    text = "Built a Python ML pipeline to detect Parkinson's disease using multimodal data. https://github.com/username/project"
    claims = _extract_concrete_claims(text)
    assert len(claims) == 1
    assert "Parkinson's disease" in claims[0]
    assert "https://github.com" not in claims[0]

def test_no_valid_claim_uses_competency_probe():
    # H. No valid claim -> COMPETENCY_PROBE
    cid = "cand-test-no-valid-claim"
    ev = EvidenceItem(
        id="EV-NO-VALID-01",
        candidate_id=cid,
        source="resume",
        evidence_type=EvidenceType.SELF_REPORT,
        text="sarthakai.eng@gmail.com\nhttps://github.com/username\n+91 9999999999",
        competency_ids=["C08"],
        confidence=0.7,
        created_at=datetime.now(timezone.utc),
    )
    save_evidence(ev)
    
    questions = select_interview_questions(cid, "role-ai-transformation-consultant", [])
    claim_qs = [q for q in questions if q["category"] == "CLAIM_VERIFICATION"]
    assert len(claim_qs) == 0, "No claims should be extracted from PII-only resume"
    
    probe_qs = [q for q in questions if q["category"] == "COMPETENCY_PROBE"]
    assert len(probe_qs) > 0
    assert probe_qs[0]["evidence_to_verify"] == "Insufficient evidence for Strategy & Enterprise Thinking" or "Insufficient" in probe_qs[0]["evidence_to_verify"]

def test_valid_claim_source_evidence_populated():
    # I. Valid claim with source evidence -> source_evidence_ids populated
    cid = "cand-test-source-evidence"
    ev = EvidenceItem(
        id="EV-VALID-SOURCE-01",
        candidate_id=cid,
        source="resume",
        evidence_type=EvidenceType.SELF_REPORT,
        text="Built a Python ML pipeline to detect Parkinson's disease using multimodal data.",
        competency_ids=["C08"],
        confidence=0.7,
        created_at=datetime.now(timezone.utc),
    )
    save_evidence(ev)
    
    questions = select_interview_questions(cid, "role-ai-transformation-consultant", [])
    claim_qs = [q for q in questions if q["category"] == "CLAIM_VERIFICATION"]
    assert len(claim_qs) > 0
    assert "EV-VALID-SOURCE-01" in claim_qs[0]["source_evidence_ids"]
