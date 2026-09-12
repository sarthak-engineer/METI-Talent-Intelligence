import json
import os
from typing import Any, Dict, List
import uuid

import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

def _build_fallback_questions(
    target_competencies: List[Dict[str, Any]],
    max_questions: int = 6
) -> List[Dict[str, Any]]:
    questions = []
    for t in target_competencies[:max_questions]:
        qid = f"q-{uuid.uuid4().hex[:8]}"
        cat = t.get("category", "COMPETENCY_PROBE")
        comp_ids = t.get("competency_ids") or [t.get("competency_id", "C01")]
        comp_name = t.get("competency_name", comp_ids[0])
        ev_to_verify = t.get("evidence_to_verify", "")
        src_ids = t.get("source_evidence_ids", [])
        reason = t.get("reason", f"Targeted probe for {comp_name}")
        signal = t.get("expected_signal", f"Demonstrates structured consulting capability in {comp_name}.")

        if cat == "CLAIM_VERIFICATION" and ev_to_verify:
            q_text = f"You mention: '{ev_to_verify}'. Walk through the baseline, intervention, measurement method, and your personal contribution."
        elif cat == "EVIDENCE_TRIANGULATION":
            q_text = f"Your profile highlights practical experience in {comp_name} while your case performance demonstrated strategic thinking. How do you connect technical execution to executive business value?"
        else:
            q_text = f"Describe a complex consulting engagement where you evaluated {comp_name}. How did you structure the approach and manage conflicting stakeholder priorities?"

        questions.append({
            "id": qid,
            "question_id": qid,
            "category": cat,
            "competency_ids": comp_ids,
            "reason": reason,
            "evidence_to_verify": ev_to_verify,
            "source_evidence_ids": src_ids,
            "expected_signal": signal,
            "question": q_text,
        })

    return questions

def generate_interview_questions(
    pathway: str,
    evidence_text: str,
    target_competencies: List[Dict[str, Any]],
    max_questions: int = 6
) -> List[Dict[str, Any]]:
    """
    Generate structured interview questions based on candidate evidence
    and targeted competencies to probe, with grounded fallback protection.
    """
    fallback = _build_fallback_questions(target_competencies, max_questions)

    if not GROQ_API_KEY:
        return fallback

    targets_str = "\n".join(
        f"- [{t.get('category', 'COMPETENCY_PROBE')}] {t.get('competency_id')}: {t.get('competency_name')} (Reason: {t.get('reason')}, Verify: '{t.get('evidence_to_verify', '')}', Source IDs: {t.get('source_evidence_ids', [])})"
        for t in target_competencies
    )

    system_prompt = f"""
You are METI's structured interview generator. Your goal is to design an interview tailored to the candidate's target pathway, existing evidence, and specific gaps or claims that need probing.

Target Pathway: {pathway}

Based on the candidate's existing evidence, generate exactly {max_questions} interview questions that address the following target areas:
{targets_str}

Important rules:
1. Do NOT ask generic questions (e.g. "Tell me about yourself").
2. Ask questions that reference concrete evidence from the context where applicable.
3. Output exactly a JSON object with a "questions" key containing an array of question objects.
4. Each question MUST specify:
   - category: CLAIM_VERIFICATION | COMPETENCY_PROBE | EVIDENCE_TRIANGULATION
   - competency_ids: array of competency strings e.g. ["C08"]
   - reason: explanation of why this question was selected
   - evidence_to_verify: summary of the specific claim/evidence being targeted
   - source_evidence_ids: array of string evidence IDs from context
   - expected_signal: what a strong answer should demonstrate
   - question: the actual question text

Candidate Evidence Context:
{evidence_text}
"""

    payload = {
        "model": GROQ_MODEL,
        "temperature": 0.2,
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            }
        ],
        "response_format": {"type": "json_object"}
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = httpx.post(
            GROQ_URL,
            headers=headers,
            json=payload,
            timeout=15.0,
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        raw_questions = parsed.get("questions", [])
    except Exception:
        return fallback

    if not raw_questions:
        return fallback

    result_questions = []
    for i, q in enumerate(raw_questions[:max_questions]):
        target = target_competencies[i] if i < len(target_competencies) else {}
        qid = f"q-{uuid.uuid4().hex[:8]}"
        result_questions.append({
            "id": qid,
            "question_id": qid,
            "category": q.get("category") or target.get("category", "COMPETENCY_PROBE"),
            "competency_ids": q.get("competency_ids") or target.get("competency_ids", ["C01"]),
            "reason": q.get("reason") or target.get("reason", "Targeted competency probe"),
            "evidence_to_verify": q.get("evidence_to_verify") or target.get("evidence_to_verify", ""),
            "source_evidence_ids": q.get("source_evidence_ids") or target.get("source_evidence_ids", []),
            "expected_signal": q.get("expected_signal") or target.get("expected_signal", "Demonstrates consulting capability"),
            "question": q.get("question") or fallback[i]["question"] if i < len(fallback) else "Explain your consulting approach."
        })

    return result_questions
