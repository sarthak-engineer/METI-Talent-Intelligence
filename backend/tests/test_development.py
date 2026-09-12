import pytest
from app.scoring.development import build_development_plan

def test_capability_gap():
    evaluations = [
        {"competency_id": "C08", "score": 60, "confidence": 0.8}
    ]
    role_intelligence = [
        {
            "role_id": "role-1",
            "role_name": "Test Role",
            "requirements": [{"competency_id": "C08", "required_level": 75, "weight": 1.0}]
        }
    ]
    
    plan = build_development_plan(evaluations, role_intelligence)
    priorities = plan["priorities"]
    
    assert len(priorities) == 1
    assert priorities[0]["gap_type"] == "CAPABILITY_GAP"
    assert priorities[0]["gap"] == 15.0
    assert priorities[0]["current_score"] == 60.0

def test_evidence_gap_no_eval():
    evaluations = []
    role_intelligence = [
        {
            "role_id": "role-1",
            "role_name": "Test Role",
            "requirements": [{"competency_id": "C03", "required_level": 65, "weight": 1.0}]
        }
    ]
    
    plan = build_development_plan(evaluations, role_intelligence)
    priorities = plan["priorities"]
    
    assert len(priorities) == 1
    assert priorities[0]["gap_type"] == "EVIDENCE_GAP"
    assert priorities[0]["current_score"] is None
    assert priorities[0]["gap"] is None
    assert priorities[0]["confidence"] == 0.0

def test_evidence_gap_zero_confidence():
    evaluations = [
        {"competency_id": "C03", "score": 0.0, "confidence": 0.0}
    ]
    role_intelligence = [
        {
            "role_id": "role-1",
            "role_name": "Test Role",
            "requirements": [{"competency_id": "C03", "required_level": 65, "weight": 1.0}]
        }
    ]
    
    plan = build_development_plan(evaluations, role_intelligence)
    priorities = plan["priorities"]
    
    assert len(priorities) == 1
    assert priorities[0]["gap_type"] == "EVIDENCE_GAP"
    assert priorities[0]["current_score"] is None

def test_multiple_priorities_sorting():
    evaluations = [
        {"competency_id": "C01", "score": 50, "confidence": 0.8}, # gap 10 (req 60)
        {"competency_id": "C02", "score": 50, "confidence": 0.8}, # gap 20 (req 70)
        # C03 missing -> EVIDENCE_GAP
        {"competency_id": "C04", "score": 80, "confidence": 0.8}, # gap 0 (req 80)
    ]
    role_intelligence = [
        {
            "role_id": "role-1",
            "role_name": "Test Role",
            "requirements": [
                {"competency_id": "C01", "required_level": 60, "weight": 1.0},
                {"competency_id": "C02", "required_level": 70, "weight": 1.0},
                {"competency_id": "C03", "required_level": 60, "weight": 1.0},
                {"competency_id": "C04", "required_level": 80, "weight": 1.0},
            ]
        }
    ]
    
    plan = build_development_plan(evaluations, role_intelligence)
    priorities = plan["priorities"]
    
    # Expected: C03 (Evidence Gap) first, C02 (20 gap) second, C01 (10 gap) third, C04 has no gap.
    assert len(priorities) == 3
    assert priorities[0]["competency_id"] == "C03"
    assert priorities[0]["gap_type"] == "EVIDENCE_GAP"
    
    assert priorities[1]["competency_id"] == "C02"
    assert priorities[1]["gap_type"] == "CAPABILITY_GAP"
    assert priorities[1]["gap"] == 20.0
    
    assert priorities[2]["competency_id"] == "C01"
    assert priorities[2]["gap_type"] == "CAPABILITY_GAP"
    assert priorities[2]["gap"] == 10.0

def test_no_gaps():
    evaluations = [
        {"competency_id": "C01", "score": 90, "confidence": 0.8}
    ]
    role_intelligence = [
        {
            "role_id": "role-1",
            "role_name": "Test Role",
            "requirements": [{"competency_id": "C01", "required_level": 80, "weight": 1.0}]
        }
    ]
    
    plan = build_development_plan(evaluations, role_intelligence)
    priorities = plan["priorities"]
    
    assert len(priorities) == 0
    assert plan["priority_count"] == 0
