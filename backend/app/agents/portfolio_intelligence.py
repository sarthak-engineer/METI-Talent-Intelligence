import json
import os
from typing import List, Any

from groq import Groq

from app.models.schemas import ClaimEvidence, EvidenceItem


ALLOWED_RELATIONSHIPS = {
    "SUPPORTS",
    "PARTIALLY_SUPPORTS",
    "NOT_SUPPORTED",
    "CONFLICTS",
}


class PortfolioIntelligenceAgent:
    """
    Compares candidate claims against portfolio evidence.

    The LLM interprets qualitative relationships.
    It does not make hiring decisions or alter deterministic scoring rules.
    """

    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")

        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not configured.")

        self.client = Groq(api_key=api_key)

        self.model = os.getenv(
            "GROQ_MODEL",
            "openai/gpt-oss-120b",
        )

    def analyze(
        self,
        claims: List[EvidenceItem],
        portfolio: List[EvidenceItem],
    ) -> List[ClaimEvidence]:

        if not claims or not portfolio:
            return []

        claim_text = "\n\n".join(
            f"CLAIM [{item.id}]\n{item.text[:6000]}"
            for item in claims
        )

        portfolio_text = "\n\n".join(
            f"PORTFOLIO [{item.id}]\n{item.text[:12000]}"
            for item in portfolio
        )

        prompt = self._build_prompt(
            claim_text=claim_text,
            portfolio_text=portfolio_text,
        )

        raw = self._call_llm(prompt)

        if not raw:
            return []

        parsed = self._parse_json(raw)

        if parsed is None:
            # One controlled repair attempt.
            repair_prompt = f"""
The previous response could not be parsed as valid JSON.

Return ONLY valid JSON.

STRICT REQUIREMENTS:

- Top-level object must contain a "claims" array.
- Every confidence value MUST be a JSON number between 0 and 1.
- Examples of valid confidence values:
  0.25
  0.65
  0.90
  1.0
- NEVER write words such as "nine", "high", "strong", or "0. nine"
  as a confidence value.
- relationship MUST be exactly one of:
  SUPPORTS
  PARTIALLY_SUPPORTS
  NOT_SUPPORTED
  CONFLICTS
- evidence_ids must contain only IDs from the supplied portfolio evidence.
- Do not invent evidence.
- Do not assume repository authorship.
- Do not assume repository presence proves expertise.

Required structure:

{{
  "claims": [
    {{
      "claim": "string",
      "evidence_ids": ["portfolio-id"],
      "relationship": "SUPPORTS",
      "confidence": 0.90,
      "explanation": "string"
    }}
  ]
}}

Return valid JSON only.

ORIGINAL RESPONSE:

{raw[:20000]}
"""

            raw = self._call_llm(repair_prompt)

            if not raw:
                return []

            parsed = self._parse_json(raw)

        if parsed is None:
            return []

        results = self._extract_results(parsed)

        if not results:
            return []

        portfolio_ids = {
            item.id
            for item in portfolio
        }

        output: List[ClaimEvidence] = []

        for item in results:
            normalized = self._normalize_result(
                item=item,
                portfolio_ids=portfolio_ids,
            )

            if normalized is not None:
                output.append(normalized)

        return output

    def _build_prompt(
        self,
        claim_text: str,
        portfolio_text: str,
    ) -> str:

        return f"""
You are the Portfolio Evidence Intelligence component of METI,
an evidence-first management consulting talent intelligence platform.

Your task is to compare candidate claims with portfolio evidence.

IMPORTANT RULES:

1. Do not assume that a repository proves authorship.
2. Do not assume that repository presence proves expertise.
3. Do not invent evidence.
4. Do not make employment or hiring decisions.
5. Absence of evidence must NOT be treated as proof that the candidate
   did not perform the claimed activity.
6. Distinguish between exactly these four relationships:
   - SUPPORTS
   - PARTIALLY_SUPPORTS
   - NOT_SUPPORTED
   - CONFLICTS
7. Use cautious, evidence-based language.
8. Only reference portfolio evidence IDs that actually exist.
9. Confidence MUST be a JSON NUMBER between 0 and 1.
10. Never write confidence as words.
11. Return ONLY valid JSON.
12. Do not include markdown fences.

EVIDENCE STRICTNESS RULES:

1. Only mark a claim as SUPPORTS or PARTIALLY_SUPPORTS when the supplied
   portfolio evidence explicitly demonstrates the claimed technology,
   activity, experience, or outcome.

2. NEVER infer technology usage from:
   - typical deployment practices
   - programming language conventions
   - operating-system assumptions
   - framework defaults
   - what "would normally be required"
   - what the repository "could theoretically" use

3. Examples:
   - Python code does NOT prove Linux experience.
   - Docker configuration does NOT prove Kubernetes experience.
   - A GitHub repository does NOT prove expertise by itself.
   - A Python project does NOT prove cloud experience.
   - A repository containing a README claim does NOT independently prove
     the claimed result unless implementation or other supplied evidence
     supports it.

4. If one part of a multi-part claim is explicitly supported and other
   parts are not supported, PARTIALLY_SUPPORTS may be used.

5. If the evidence does not explicitly demonstrate a claimed technology
   or experience, do NOT infer it. Treat that portion as unsupported.

6. Absence of evidence is NOT a conflict.

7. CONFLICTS should only be used when supplied evidence explicitly
   contradicts the candidate's claim.

8. Never accuse the candidate of lying, exaggerating, or deception.
   Describe unsupported or contradictory evidence neutrally and recommend
   human review when appropriate.

For each important candidate claim, return:

{{
  "claims": [
    {{
      "claim": "candidate claim",
      "evidence_ids": ["portfolio evidence ID"],
      "relationship": "SUPPORTS",
      "confidence": 0.90,
      "explanation": "Explain exactly why the available portfolio evidence supports, partially supports, does not support, or conflicts with the claim."
    }}
  ]
}}

CONFIDENCE GUIDANCE:

- 0.90-1.00 = strong direct evidence
- 0.75-0.89 = good evidence with some limitations
- 0.55-0.74 = partial or indirect evidence
- 0.25-0.54 = weak evidence
- 0.00-0.24 = little or no supporting evidence

IMPORTANT:

If the portfolio does not contain evidence for a claim:

- relationship = "NOT_SUPPORTED"
- evidence_ids = []
- Do NOT invent an evidence ID.

If evidence only partially demonstrates the claim:

- relationship = "PARTIALLY_SUPPORTS"

If the evidence contradicts the claim:

- relationship = "CONFLICTS"

Remember:

NOT_SUPPORTED does NOT mean the candidate did not perform the activity.
It only means the supplied portfolio evidence does not support the claim.

CANDIDATE CLAIMS:

{claim_text}

PORTFOLIO EVIDENCE:

{portfolio_text}
"""

    def _call_llm(self, prompt: str) -> str:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a careful evidence analysis system. "
                            "Never fabricate evidence. "
                            "Return syntactically valid JSON only."
                        ),
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )

            raw = response.choices[0].message.content

            return raw.strip() if raw else ""

        except Exception:
            return ""

    @staticmethod
    def _parse_json(raw: str) -> Any:
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return None

    @staticmethod
    def _extract_results(parsed: Any) -> List[dict]:
        if not isinstance(parsed, dict):
            return []

        results = parsed.get("claims", [])

        if not isinstance(results, list):
            return []

        return [
            item
            for item in results
            if isinstance(item, dict)
        ]

    @staticmethod
    def _normalize_result(
        item: dict,
        portfolio_ids: set,
    ) -> ClaimEvidence | None:

        claim = str(
            item.get("claim", "")
        ).strip()

        if not claim:
            return None

        relationship = str(
            item.get("relationship", "NOT_SUPPORTED")
        ).strip().upper()

        if relationship not in ALLOWED_RELATIONSHIPS:
            relationship = "NOT_SUPPORTED"

        evidence_ids = item.get(
            "evidence_ids",
            [],
        )

        if not isinstance(evidence_ids, list):
            evidence_ids = []

        valid_evidence_ids = [
            str(evidence_id)
            for evidence_id in evidence_ids
            if str(evidence_id) in portfolio_ids
        ]

        confidence = PortfolioIntelligenceAgent._safe_confidence(
            item.get("confidence", 0.0)
        )

        explanation = str(
            item.get("explanation", "")
        ).strip()

        return ClaimEvidence(
            claim=claim,
            evidence_ids=valid_evidence_ids,
            relationship=relationship,
            confidence=confidence,
            explanation=explanation,
        )

    @staticmethod
    def _safe_confidence(value: Any) -> float:

        try:
            confidence = float(value)
        except (TypeError, ValueError):
            confidence = 0.0

        return max(
            0.0,
            min(1.0, confidence),
        )
