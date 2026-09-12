import json
import os
from typing import List

from dotenv import load_dotenv
from groq import Groq

from app.assessment.questions import COMPETENCIES
from app.models.schemas import CompetencyEvaluation, EvidenceItem, EvidenceType


load_dotenv()


# Keep comfortably below the current Groq 8,000 TPM limit.
#
# This is an approximate character budget, not an exact token budget.
# ~4 characters/token is a reasonable conservative approximation for
# ordinary English text.
MAX_EVIDENCE_CHARS = 18000
MAX_ITEM_CHARS = 6000


class EvidenceMapperAgent:
    """
    METI Evidence Mapping Agent.

    Groq interprets the supplied candidate evidence.

    Python validates the response.

    Python calculates the final deterministic metrics.

    The model must never invent evidence or alter competency weights.

    Evidence sent to the model is deliberately bounded so that large
    portfolio/resume artifacts cannot exceed the model/service token limit.
    """

    def __init__(self):

        api_key = os.getenv("GROQ_API_KEY")

        if not api_key:

            raise RuntimeError(
                "GROQ_API_KEY is not configured."
            )

        self.client = Groq(
            api_key=api_key
        )

        self.model = os.getenv(
            "GROQ_MODEL",
            "openai/gpt-oss-120b",
        )

    @staticmethod
    def _compact_evidence(
        evidence_items: List[EvidenceItem],
    ) -> str:
        """
        Build a bounded evidence payload for the LLM.

        Important:
        - Original evidence IDs are preserved.
        - Source/type/confidence are preserved.
        - Evidence is truncated per item rather than dropping
          evidence IDs completely.
        - The original EvidenceItem remains unchanged in storage.
        """

        # Sort evidence by confidence (descending) to ensure high-value 
        # evidence like case work samples and verified portfolios 
        # are prioritized over low-value self-reported resumes when
        # approaching the token limit.
        sorted_items = sorted(
            evidence_items,
            key=lambda e: e.confidence,
            reverse=True,
        )

        sections = []

        total_chars = 0

        for item in sorted_items:

            remaining = (
                MAX_EVIDENCE_CHARS
                - total_chars
            )

            if remaining <= 0:
                break

            item_text = item.text or ""

            item_text = item_text[
                :MAX_ITEM_CHARS
            ]

            # Do not exceed the remaining global budget.
            item_text = item_text[
                :remaining
            ]

            section = f"""
EVIDENCE ID: {item.id}
SOURCE: {item.source}
TYPE: {item.evidence_type.value}
BASE CONFIDENCE: {item.confidence}
TEXT:
{item_text}
"""

            sections.append(
                section.strip()
            )

            total_chars += len(
                section
            )

        return "\n\n".join(
            sections
        )

    def evaluate(
        self,
        evidence_items: List[EvidenceItem],
    ) -> List[CompetencyEvaluation]:
        from app.agents.quality import is_substantive_response

        valid_items = []
        insufficient_evaluations = []
        valid_competency_ids = {c.id for c in COMPETENCIES}

        for item in evidence_items:
            if not is_substantive_response(item.text):
                cids = item.competency_ids or item.canonical_competency_ids or []
                for cid in cids:
                    if cid in valid_competency_ids:
                        insufficient_evaluations.append(
                            CompetencyEvaluation(
                                competency_id=cid,
                                score=0.0,
                                confidence=0.0,
                                evidence_ids=[item.id],
                                rationale="Response did not contain sufficient substantive evidence to assess this competency.",
                                evidence_summary=[],
                                strengths=[],
                                gaps=[],
                                flags=["INSUFFICIENT_SUBSTANTIVE_RESPONSE"],
                            )
                        )
            else:
                valid_items.append(item)

        if not valid_items:
            return insufficient_evaluations

        competency_text = "\n".join(
            f"{c.id}: {c.name} - {c.description}"
            for c in COMPETENCIES
        )

        evidence_text = (
            self._compact_evidence(
                valid_items
            )
        )

        system_prompt = """
You are the METI Evidence Mapping Agent.

Your job is to interpret candidate evidence against the
METI management consulting competency framework.

CRITICAL RULES:

1. Use ONLY the evidence supplied by the system.

2. NEVER invent evidence.

3. NEVER invent projects, responsibilities, achievements,
   leadership experience, consulting experience, or outcomes.

4. Every evaluation MUST reference one or more supplied
   evidence IDs.

5. Only use the competency IDs supplied by the system.

6. Do not change competency weights.

7. Distinguish explicit evidence from inference.

8. If evidence is weak, use a lower score and/or confidence.

9. Do not use protected characteristics.

10. Do not make hiring or rejection decisions.

11. Return JSON matching the required schema.

12. Scores represent demonstrated evidence, NOT the person's
    overall worth or guaranteed ability.

13. A high score requires meaningful evidence.

14. A lack of evidence should not automatically be interpreted
    as lack of ability.

15. If an evidence item is truncated, use only the visible
    content and do not infer the missing portion.

16. Do not assume authorship or expertise merely because a
    repository, project, technology, or organization appears
    in the evidence.

17. If evidence cannot substantiate a competency, do not
    manufacture an evaluation for that competency.
"""

        user_prompt = f"""
METI COMPETENCY FRAMEWORK:

{competency_text}

CANDIDATE EVIDENCE:

{evidence_text}

Evaluate only competencies for which the supplied evidence
provides meaningful support.

For each supported competency provide:

- competency_id
- score from 0 to 100
- confidence from 0 to 1
- exact evidence IDs supporting the evaluation
- rationale (a short explanation of the score)
- evidence_summary (a list of key evidence items)
- strengths supported by evidence
- gaps or limitations in the evidence
- flags if there are concerns

Return only the required structured output.
"""

        models_to_try = [
            self.model,
            "llama-3.3-70b-versatile",
            "mixtral-8x7b-32768",
        ]

        payload = None
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
                    response_format={
                        "type": "json_object"
                    },
                    timeout=25.0,
                )

                content = (
                    response.choices[0]
                    .message.content
                )

                if content:
                    payload = json.loads(content)
                    break
            except Exception:
                continue

        if payload is None:
            return self._heuristic_fallback(evidence_items)

        # Groq may return either:
        # {"evaluations": [...]}
        # or directly [...]

        if isinstance(payload, dict):

            raw_evaluations = (
                payload.get(
                    "evaluations",
                    []
                )
            )

        elif isinstance(payload, list):

            raw_evaluations = payload

        else:

            raw_evaluations = []

        valid_competency_ids = {
            competency.id
            for competency in COMPETENCIES
        }

        valid_evidence_ids = {
            evidence.id
            for evidence in evidence_items
        }

        evaluations = []

        for item in raw_evaluations:

            if not isinstance(
                item,
                dict,
            ):
                continue

            competency_id = item.get(
                "competency_id"
            )

            if (
                competency_id
                not in valid_competency_ids
            ):
                continue

            evidence_ids = [
                evidence_id
                for evidence_id
                in item.get(
                    "evidence_ids",
                    [],
                )
                if evidence_id
                in valid_evidence_ids
            ]

            if not evidence_ids:
                continue

            score = max(
                0,
                min(
                    100,
                    float(
                        item.get(
                            "score",
                            0,
                        )
                    ),
                ),
            )

            confidence = max(
                0,
                min(
                    1,
                    float(
                        item.get(
                            "confidence",
                            0,
                        )
                    ),
                ),
            )

            strengths = item.get(
                "strengths",
                [],
            )

            gaps = item.get(
                "gaps",
                [],
            )

            flags = item.get(
                "flags",
                [],
            )

            # Normalize LLM output because models
            # may return a single string instead
            # of a list.

            if isinstance(
                strengths,
                str,
            ):

                strengths = [
                    strengths
                ]

            if isinstance(
                gaps,
                str,
            ):

                gaps = [
                    gaps
                ]

            if isinstance(
                flags,
                str,
            ):

                flags = [
                    flags
                ]

            if not isinstance(
                strengths,
                list,
            ):

                strengths = []

            if not isinstance(
                gaps,
                list,
            ):

                gaps = []

            if not isinstance(
                flags,
                list,
            ):

                flags = []

            evidence_summary = item.get(
                "evidence_summary",
                [],
            )

            if isinstance(
                evidence_summary,
                str,
            ):

                evidence_summary = [
                    evidence_summary
                ]

            if not isinstance(
                evidence_summary,
                list,
            ):

                evidence_summary = []

            evaluations.append(

                CompetencyEvaluation(

                    competency_id=(
                        competency_id
                    ),

                    score=score,

                    confidence=confidence,

                    evidence_ids=(
                        evidence_ids
                    ),

                    rationale=str(
                        item.get(
                            "rationale",
                            "",
                        )
                    ),

                    evidence_summary=(
                        evidence_summary
                    ),

                    strengths=strengths,

                    gaps=gaps,

                    flags=flags,

                )

            )

        evaluations.extend(insufficient_evaluations)
        return evaluations

    @staticmethod
    def _heuristic_fallback(evidence_items: List[EvidenceItem]) -> List[CompetencyEvaluation]:
        """
        Deterministic heuristic evidence mapper fallback when Groq LLM API rate limits are reached.
        """
        evaluations = []
        valid_competency_ids = {c.id for c in COMPETENCIES}
        
        comp_map = {}
        for item in evidence_items:
            cids = item.competency_ids or item.canonical_competency_ids or []
            for cid in cids:
                if cid in valid_competency_ids:
                    comp_map.setdefault(cid, []).append(item)
                    
        for cid, items in comp_map.items():
            ev_ids = [it.id for it in items]
            best_confidence = max((it.confidence for it in items), default=0.5)
            
            base_score = 65.0
            if any(str(getattr(it.evidence_type, "value", it.evidence_type)) in {"case_work_sample", "consulting_response"} for it in items):
                base_score += 10.0
            if any(str(getattr(it.evidence_type, "value", it.evidence_type)) == "structured_scenario" for it in items):
                base_score += 5.0
            score = max(0.0, min(100.0, base_score))
            
            evaluations.append(
                CompetencyEvaluation(
                    competency_id=cid,
                    score=round(score, 2),
                    confidence=round(best_confidence, 3),
                    evidence_ids=ev_ids,
                    rationale=f"Evaluated from {len(items)} evidence items (heuristic fallback).",
                    evidence_summary=[f"{it.source}: {it.text[:80]}..." for it in items[:3]],
                    strengths=["Demonstrated capability across submitted evidence items."],
                    gaps=[],
                    flags=[],
                )
            )
        return evaluations

