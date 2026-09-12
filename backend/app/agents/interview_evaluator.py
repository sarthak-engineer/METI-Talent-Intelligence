import json
import os
from typing import Any, Dict

import httpx
from dotenv import load_dotenv


load_dotenv()


GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def evaluate_interview_answer(
    question: Dict[str, Any],
    answer: str,
) -> Dict[str, Any]:

    from app.agents.quality import is_substantive_response
    if not is_substantive_response(answer, question.get('question', '')):
        return {
            "score": 0.0,
            "confidence": 0.0,
            "observations": ["Candidate response was not substantive enough to evaluate."],
            "strengths": [],
            "gaps": [],
            "flags": ["INSUFFICIENT_SUBSTANTIVE_RESPONSE"],
            "evidence_quality": "low"
        }

    fallback_eval = {
        "score": 0.0,
        "confidence": 0.0,
        "observations": ["Evaluation could not be completed due to system limits. Evidence preserved for manual review."],
        "strengths": [],
        "gaps": ["LLM rate limit fallback applied during submission."],
        "flags": ["EVALUATION_FAILED_FALLBACK"],
        "evidence_quality": "low"
    }

    if not GROQ_API_KEY:
        return fallback_eval

    system_prompt = """
You are METI's interview evidence evaluator. Return ONLY valid JSON with score, confidence, observations, strengths, gaps, flags, evidence_quality.
"""
    user_prompt = f"Competency IDs: {question.get('competency_ids', [question.get('competency_id')])}\nQuestion: {question.get('question', '')}\nAnswer: {answer}"

    payload = {
        "model": GROQ_MODEL,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
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
        result = json.loads(content)
    except Exception:
        return fallback_eval

    score = float(result.get("score", 0))
    confidence = float(result.get("confidence", 0))

    result["score"] = max(0.0, min(100.0, score))
    result["confidence"] = max(0.0, min(1.0, confidence))

    if result.get("evidence_quality") not in {
        "low",
        "moderate",
        "high",
    }:
        result["evidence_quality"] = "low"

    result["observations"] = [
        str(item)
        for item in (result.get("observations") or [])
    ]

    result["strengths"] = [
        str(item)
        for item in (result.get("strengths") or [])
    ]

    result["gaps"] = [
        str(item)
        for item in (result.get("gaps") or [])
    ]

    result["flags"] = [
        str(item)
        for item in (result.get("flags") or [])
    ]

    return result
