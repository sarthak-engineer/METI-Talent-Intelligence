from typing import Any, Dict, List, Optional
import re

from app.scoring.roles import ROLE_PROFILES
from app.agents.interview_generator import generate_interview_questions
from app.evidence.store import get_candidate_evidence
from app.models.schemas import EvidenceItem, EvidenceType

def _competency_name(competency_id: str) -> str:
    names = {
        "C01": "Strategy & Enterprise Thinking",
        "C02": "Research & Insight",
        "C03": "Value Chain & Enterprise Analysis",
        "C04": "Process / Capability / TOM",
        "C05": "Transformation & Change",
        "C06": "Organisation & Governance",
        "C07": "Programme / Portfolio / Benefits",
        "C08": "Enterprise AI Transformation",
        "C09": "Problem Structuring & Commercial Thinking",
        "C10": "Executive Communication — Written",
        "C11": "Executive Communication — Video",
        "C12": "Stakeholder / Facilitation",
        "C13": "Professional Judgement",
        "C14": "Learning Agility / Adaptability",
    }
    return names.get(competency_id, competency_id)

def _strip_urls_and_pii(text: str) -> str:
    # Remove emails
    text = re.sub(r'[\w\.-]+@[\w\.-]+\.\w+', '', text)
    # Remove URLs (http, https, www, github, linkedin)
    text = re.sub(r'(https?://|www\.)[^\s]+', '', text)
    text = re.sub(r'(github\.com|linkedin\.com/in|twitter\.com)/[^\s]+', '', text)
    # Remove standalone candidate IDs
    text = re.sub(r'(candidate|qa-candidate)[-_][a-zA-Z0-9]+', '', text, flags=re.IGNORECASE)
    # Remove phone numbers like +91 123 456 7890
    text = re.sub(r'\+?\d{1,3}[-\s\.]?\(?\d{3}\)?[-\s\.]?\d{3}[-\s\.]?\d{4}', '', text)
    return text.strip()

def _extract_concrete_claims(text: str) -> List[str]:
    """
    Extract concrete claim snippets from resume or portfolio evidence text,
    ensuring PII, URLs, and metadata are rejected.
    """
    if not text or not text.strip():
        return []
    
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    claims = []
    
    for line in lines:
        if len(line) < 15 or line.isupper():
            continue
            
        # Reject filenames
        if re.match(r'^[a-zA-Z0-9_\-\s]+\.(pdf|docx?|txt|rtf|md)$', line, re.IGNORECASE):
            continue
            
        clean = re.sub(r"^[•\-\*\d\.]+\s*", "", line).strip()
        
        # Strip PII and URLs from the claim
        safe_clean = _strip_urls_and_pii(clean)
        
        # If what's left is too short, it was mostly PII/metadata
        if len(safe_clean) >= 20:
            claims.append(safe_clean)
            
    return claims

def select_interview_questions(
    candidate_id: str,
    pathway: str,
    evaluations: List[Dict[str, Any]],
    max_questions: int = 6,
) -> List[Dict[str, Any]]:
    """
    Selects interview targets grounded explicitly in candidate evidence:
    1. CLAIM_VERIFICATION from candidate resume/profile claims.
    2. EVIDENCE_TRIANGULATION where resume overlaps with assessment/case evidence.
    3. COMPETENCY_PROBE for coverage/confidence gaps in target pathway.
    """
    
    role = next((r for r in ROLE_PROFILES if r.id == pathway), None)
    role_reqs = role.requirements if role else []

    eval_map = {e.get("competency_id"): e for e in evaluations if e.get("competency_id")}
    evidence_items = get_candidate_evidence(candidate_id)

    # Classify evidence items
    resume_items: List[EvidenceItem] = []
    assessment_case_items: List[EvidenceItem] = []
    
    for item in evidence_items:
        etype = item.evidence_type.value if hasattr(item.evidence_type, "value") else str(item.evidence_type)
        src = (item.source or "").lower()
        
        if etype in ["self_report", "verified_portfolio"] or "resume" in src or "portfolio" in src:
            resume_items.append(item)
        elif etype in ["structured_scenario", "written_response", "diagnostic", "case_work_sample"] or "case" in src or "assessment" in src:
            assessment_case_items.append(item)

    targets: List[Dict[str, Any]] = []
    seen_comp_category = set()

    # -------------------------------------------------------------
    # 1. CLAIM VERIFICATION (Resume/Profile Claims)
    # -------------------------------------------------------------
    for r_item in resume_items:
        claims = _extract_concrete_claims(r_item.text)
        if not claims:
            continue
            
        target_comps = r_item.competency_ids or [req.competency_id for req in role_reqs[:2]]
        for comp_id in target_comps:
            key = (comp_id, "CLAIM_VERIFICATION")
            if key in seen_comp_category:
                continue
                
            claim_snippet = claims[0]
            if len(claim_snippet) > 140:
                claim_snippet = claim_snippet[:137] + "..."
                
            comp_name = _competency_name(comp_id)
            targets.append({
                "category": "CLAIM_VERIFICATION",
                "competency_id": comp_id,
                "competency_ids": [comp_id],
                "competency_name": comp_name,
                "reason": f"Candidate profile contains a concrete claim relevant to {comp_name}.",
                "evidence_to_verify": claim_snippet,
                "source_evidence_ids": [r_item.id],
                "expected_signal": f"Substantiates baseline, methodology, personal contribution, and outcomes for {comp_name}.",
                "priority": 100
            })
            seen_comp_category.add(key)
            break

    # -------------------------------------------------------------
    # 2. EVIDENCE TRIANGULATION (Resume + Case/Assessment Overlap)
    # -------------------------------------------------------------
    if resume_items and assessment_case_items:
        for r_item in resume_items:
            for c_item in assessment_case_items:
                overlap = set(r_item.competency_ids).intersection(set(c_item.competency_ids))
                for comp_id in overlap:
                    key = (comp_id, "EVIDENCE_TRIANGULATION")
                    if key in seen_comp_category:
                        continue
                        
                    comp_name = _competency_name(comp_id)
                    targets.append({
                        "category": "EVIDENCE_TRIANGULATION",
                        "competency_id": comp_id,
                        "competency_ids": [comp_id],
                        "competency_name": comp_name,
                        "reason": f"Overlap between profile claim ({r_item.id}) and case/assessment evidence ({c_item.id}) for {comp_name}.",
                        "evidence_to_verify": f"Triangulating claim from {r_item.source} ({r_item.id}) with {c_item.source} ({c_item.id})",
                        "source_evidence_ids": [r_item.id, c_item.id],
                        "expected_signal": f"Tests consistency between technical implementation and business consulting impact in {comp_name}.",
                        "priority": 90
                    })
                    seen_comp_category.add(key)

    # -------------------------------------------------------------
    # 3. COMPETENCY PROBE (Gaps / Insufficient Evidence)
    # -------------------------------------------------------------
    for req in role_reqs:
        comp_id = req.competency_id
        ev = eval_map.get(comp_id)
        comp_name = _competency_name(comp_id)
        key = (comp_id, "COMPETENCY_PROBE")
        
        if key in seen_comp_category:
            continue
            
        if not ev:
            targets.append({
                "category": "COMPETENCY_PROBE",
                "competency_id": comp_id,
                "competency_ids": [comp_id],
                "competency_name": comp_name,
                "reason": f"Critical requirement ({int(req.weight * 100)}% role weight) with no available evidence.",
                "evidence_to_verify": f"Insufficient evidence for {comp_name}",
                "source_evidence_ids": [],
                "expected_signal": f"Demonstrates structured consulting approach and problem solving in {comp_name}.",
                "priority": 80 + (req.weight * 20)
            })
            seen_comp_category.add(key)
        else:
            confidence = float(ev.get("confidence", 0.0))
            score = float(ev.get("score", 0.0))
            if confidence < 0.6 or score < req.required_level - 10:
                targets.append({
                    "category": "COMPETENCY_PROBE",
                    "competency_id": comp_id,
                    "competency_ids": [comp_id],
                    "competency_name": comp_name,
                    "reason": f"Role requirement gap for {comp_name} (Confidence: {confidence:.2f}, Score: {score:.1f}).",
                    "evidence_to_verify": f"Low confidence evidence ({confidence:.2f}) for {comp_name}",
                    "source_evidence_ids": ev.get("evidence_ids", []),
                    "expected_signal": f"Probes consulting judgment and problem structuring depth in {comp_name}.",
                    "priority": 70 + ((1.0 - confidence) * 20)
                })
                seen_comp_category.add(key)

    # -------------------------------------------------------------
    # 4. Fallback if targets are insufficient (No resume claims present)
    # -------------------------------------------------------------
    if len(targets) < max_questions:
        all_comp_ids = ["C01", "C03", "C04", "C05", "C08", "C09", "C10", "C12", "C13"]
        for comp_id in all_comp_ids:
            if len(targets) >= max_questions:
                break
            key = (comp_id, "COMPETENCY_PROBE")
            if key not in seen_comp_category:
                comp_name = _competency_name(comp_id)
                targets.append({
                    "category": "COMPETENCY_PROBE",
                    "competency_id": comp_id,
                    "competency_ids": [comp_id],
                    "competency_name": comp_name,
                    "reason": f"General pathway consulting probe for {comp_name}.",
                    "evidence_to_verify": f"Insufficient evidence for {comp_name}",
                    "source_evidence_ids": [],
                    "expected_signal": f"Demonstrates professional consulting capability in {comp_name}.",
                    "priority": 50
                })
                seen_comp_category.add(key)

    # Sort targets by priority descending
    targets.sort(key=lambda x: x["priority"], reverse=True)
    selected_targets = targets[:max_questions]

    # Compact evidence string for context window
    evidence_str = ""
    for item in evidence_items:
        if len(evidence_str) > 15000:
            break
        etype = item.evidence_type.value if hasattr(item.evidence_type, "value") else str(item.evidence_type)
        evidence_str += f"\n--- Evidence ID: {item.id} | Source: {item.source} | Type: {etype} ---\n{item.text}\n"

    # Generate questions via LLM agent (with built-in grounded fallback)
    generated = generate_interview_questions(
        pathway=role.name if role else pathway,
        evidence_text=evidence_str,
        target_competencies=selected_targets,
        max_questions=max_questions
    )
    
    return generated
