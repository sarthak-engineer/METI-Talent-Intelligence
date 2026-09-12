import pytest
from app.reports.report_generator import generate_detailed_report
from app.models.schemas import EvidenceItem, EvidenceType
from datetime import datetime

class DummyCandidate:
    def __init__(self, id):
        self.id = id
        self.full_name = "Test Candidate"
        self.target_pathway = "role-ai-transformation-consultant"

def mock_get_candidate(cid):
    return DummyCandidate(cid)

def mock_get_candidate_evidence(cid):
    if cid == "missing_evidence_candidate":
        return []
    return [
        # Unmapped evidence
        EvidenceItem(
            id="ev-123",
            candidate_id=cid,
            source="self_assessment",
            evidence_type=EvidenceType.SELF_REPORT,
            text="Some unmapped text",
            confidence=0.25,
            created_at=datetime.now()
        )
    ]

def test_report_uses_snapshot_evidence_confidence(monkeypatch):
    import app.reports.report_generator as rg
    monkeypatch.setattr(rg, "get_candidate", mock_get_candidate)
    monkeypatch.setattr(rg, "get_candidate_evidence", mock_get_candidate_evidence)

    analysis = {
        "candidate_id": "c-123",
        "evidence_confidence": 0.85,
        "evaluations": [],
        "role_readiness": [],
    }

    report = generate_detailed_report(analysis)
    
    assert report["evidence_confidence"] == 0.85
    assert report["executive_summary"]["evidence_confidence"] == 0.85

def test_report_unmapped_evidence(monkeypatch):
    import app.reports.report_generator as rg
    monkeypatch.setattr(rg, "get_candidate", mock_get_candidate)
    monkeypatch.setattr(rg, "get_candidate_evidence", mock_get_candidate_evidence)

    analysis = {
        "candidate_id": "c-123",
        "evidence_confidence": 0.85,
        "evaluations": [],
    }

    report = generate_detailed_report(analysis)
    assert len(report["unmapped_evidence"]) == 1
    assert report["unmapped_evidence"][0]["source_confidence"] == 0.25

def test_report_missing_evidence(monkeypatch):
    import app.reports.report_generator as rg
    monkeypatch.setattr(rg, "get_candidate", mock_get_candidate)
    monkeypatch.setattr(rg, "get_candidate_evidence", mock_get_candidate_evidence)

    analysis = {
        "candidate_id": "missing_evidence_candidate",
        "evidence_confidence": 0.0,
        "evaluations": [],
    }

    report = generate_detailed_report(analysis)
    assert len(report["unmapped_evidence"]) == 0
    assert report["evidence_confidence"] == 0.0
