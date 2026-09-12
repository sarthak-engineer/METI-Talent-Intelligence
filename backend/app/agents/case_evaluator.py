import json
import os
from typing import Any, Dict, List

from groq import Groq

from app.case.definitions import CaseRubricDimension


class CaseEvaluatorAgent:
    """
    Evaluates a consulting work sample using the METI competency framework.

    The LLM interprets the candidate's qualitative response.
    Deterministic scoring remains outside the LLM.
    """

    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not configured.")

        self.client = Groq(api_key=api_key)
        self.model = model

    def evaluate(
        self,
        case_title: str,
        case_prompt: str,
        candidate_response: str,
        expected_competency_ids: List[str],
        evaluation_rubric: List[CaseRubricDimension],
    ) -> Dict[str, Any]:

        from app.agents.quality import is_substantive_response
        if not is_substantive_response(candidate_response, case_prompt):
            return {
                "evaluations": [
                    {
                        "competency_id": cid,
                        "score": 0.0,
                        "confidence": 0.0,
                        "strengths": [],
                        "gaps": [],
                        "flags": ["INSUFFICIENT_SUBSTANTIVE_RESPONSE"],
                        "rationale": "Response did not contain sufficient substantive evidence to assess this competency.",
                        "evidence_summary": []
                    }
                    for cid in expected_competency_ids
                ],
                "overall_summary": "Response was insufficient to evaluate.",
                "recommended_follow_up": ["Require candidate to resubmit with a substantive response."]
            }

        rubric_text = "\n".join(
            f"{r.competency_id}: {r.description}"
            for r in evaluation_rubric
        )

        system_prompt = f"""
You are the METI Consulting Work Sample Evaluation Agent.

Your task is to evaluate a candidate's response to a management consulting case.

You are NOT making a hiring decision.

You are interpreting qualitative evidence against the METI competency framework.

Evaluate only observable evidence in the candidate's response.

Do not infer:
- personality
- protected characteristics
- mental health
- attractiveness
- age
- gender
- race
- disability
- accent
- socioeconomic background

Competencies relevant to this case and their evaluation rubrics:

{rubric_text}

Scoring guidance:

0-20 = little or no demonstrated evidence
21-40 = limited evidence
41-60 = developing evidence
61-80 = strong evidence
81-100 = very strong evidence

Return valid JSON only.

Required structure:

{{
  "evaluations": [
    {{
      "competency_id": "C09",
      "score": 0,
      "confidence": 0.0,
      "strengths": [],
      "gaps": [],
      "flags": [],
      "rationale": "",
      "evidence_summary": []
    }}
  ],
  "overall_summary": "",
  "recommended_follow_up": []
}}

Confidence refers to confidence in the interpretation of the submitted response,
not the candidate's ability.

Be conservative.
Do not award high scores merely because consulting terminology is used.
Reward clear reasoning, structure, assumptions, trade-offs, prioritisation,
commercial thinking and judgement where actually demonstrated.
"""

        user_prompt = f"""
CASE TITLE:
{case_title}

CASE:
{case_prompt}

CANDIDATE RESPONSE:
{candidate_response}

Evaluate the candidate response against the relevant METI competencies.
"""

        models_to_try = [
            self.model,
            "llama-3.3-70b-versatile",
            "mixtral-8x7b-32768",
        ]

        result = None
        for m in models_to_try:
            try:
                response = self.client.chat.completions.create(
                    model=m,
                    messages=[
                        {
                            "role": "system",
                            "content": system_prompt,
                        },
                        {
                            "role": "user",
                            "content": user_prompt,
                        },
                    ],
                    response_format={"type": "json_object"},
                    timeout=20.0,
                )

                content = response.choices[0].message.content

                if content:
                    result = json.loads(content)
                    break
            except Exception:
                continue

        if result is None:
            # Deterministic safe fallback when LLM API rate limits are reached
            word_count = len(candidate_response.split())
            result = {
                "evaluations": [
                    {
                        "competency_id": cid,
                        "score": 0.0,
                        "confidence": 0.0,
                        "strengths": [],
                        "gaps": ["LLM rate limit fallback applied during submission."],
                        "flags": ["EVALUATION_FAILED_FALLBACK"],
                        "rationale": "Evaluation could not be completed due to system limits. Evidence preserved for manual review.",
                        "evidence_summary": [f"Candidate submitted {word_count} word consulting case work sample."],
                    }
                    for cid in expected_competency_ids
                ],
                "overall_summary": f"Case response submitted ({word_count} words) but evaluation failed.",
                "recommended_follow_up": ["Verify in assessor review queue."],
            }

        return self._validate_result(result, expected_competency_ids)

    def _validate_result(self, result: Dict[str, Any], expected_competency_ids: List[str]) -> Dict[str, Any]:

        if not isinstance(result, dict):
            raise ValueError("Case evaluation must be a JSON object.")

        evaluations = result.get("evaluations", [])

        if not isinstance(evaluations, list):
            raise ValueError("evaluations must be a list.")

        valid_ids = set(expected_competency_ids)
        cleaned = []

        for evaluation in evaluations:
            if not isinstance(evaluation, dict):
                continue

            competency_id = evaluation.get("competency_id")

            if competency_id not in valid_ids:
                continue

            score = float(evaluation.get("score", 0))
            confidence = float(evaluation.get("confidence", 0))

            score = max(0.0, min(100.0, score))
            confidence = max(0.0, min(1.0, confidence))

            def as_list(value):
                if value is None:
                    return []
                if isinstance(value, list):
                    return [str(item) for item in value]
                return [str(value)]

            cleaned.append(
                {
                    "competency_id": competency_id,
                    "score": round(score, 2),
                    "confidence": round(confidence, 3),
                    "strengths": as_list(evaluation.get("strengths")),
                    "gaps": as_list(evaluation.get("gaps")),
                    "flags": as_list(evaluation.get("flags")),
                    "rationale": str(
                        evaluation.get("rationale", "")
                    ),
                    "evidence_summary": as_list(
                        evaluation.get("evidence_summary")
                    ),
                }
            )

        def as_list(value):
            if value is None:
                return []
            if isinstance(value, list):
                return [str(item) for item in value]
            return [str(value)]

        return {
            "evaluations": cleaned,
            "overall_summary": str(
                result.get("overall_summary", "")
            ),
            "recommended_follow_up": as_list(
                result.get("recommended_follow_up")
            ),
        }
