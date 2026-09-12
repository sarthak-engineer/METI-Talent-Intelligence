from typing import List, Optional

from app.assessment.diagnostic import get_diagnostic_questions, DiagnosticQuestion
from app.evidence.store import get_candidate_evidence
from app.models.schemas import TargetPathway
from app.scoring.roles import ROLE_PROFILES


def select_questions(
    candidate_id: Optional[str] = None,
    target_pathway: str = TargetPathway.EXPLORING.value,
    limit: int = 6,
) -> List[DiagnosticQuestion]:
    """
    Deterministically selects diagnostic questions based on:
    1. Base Priority
    2. Target Pathway Match
    3. Missing Evidence (Coverage Gaps)
    """
    all_questions = get_diagnostic_questions()

    # 1. Evaluate existing evidence to find covered composite competencies
    covered_composite_ids = set()
    if candidate_id:
        evidence_items = get_candidate_evidence(candidate_id)
        for item in evidence_items:
            # Map canonical to composite to determine coverage
            from app.assessment.ontology import map_canonical_to_composite
            for canon_id in item.canonical_competency_ids:
                for mapping in map_canonical_to_composite(canon_id):
                    covered_composite_ids.add(mapping.composite_id)

    # 2. Extract role profile requirements if a specific pathway is selected
    role_required_competencies = set()
    if target_pathway != TargetPathway.EXPLORING.value:
        role = next((r for r in ROLE_PROFILES if r.id == target_pathway), None)
        if role:
            for req in role.requirements:
                role_required_competencies.add(req.competency_id)

    # 3. Score questions
    scored_questions = []
    for q in all_questions:
        score = q.priority

        if target_pathway != TargetPathway.EXPLORING.value:
            # Bonus if explicitly targeted for this role
            if target_pathway in q.applicable_role_ids:
                score += 10

            # Bonus if it tests a competency required by the role
            tests_required_competency = any(
                comp_id in role_required_competencies for comp_id in q.composite_competency_ids
            )
            if tests_required_competency:
                score += 10

        # Evidence Gap Bonus (for exploring, this ensures balanced foundation)
        # We give a bonus for each composite competency that is NOT currently evidenced
        gap_count = sum(
            1 for comp_id in q.composite_competency_ids if comp_id not in covered_composite_ids
        )
        score += gap_count * 5

        scored_questions.append((score, q))

    # 4. Sort deterministically: Score (DESC), Priority (DESC), Question ID (ASC)
    scored_questions.sort(key=lambda x: (x[0], x[1].priority, x[1].id), reverse=True)
    
    # Reverse the ID sort because we used reverse=True on the whole tuple
    # Actually, to sort ID ascending while sorting score/priority descending:
    scored_questions.sort(key=lambda x: (-x[0], -x[1].priority, x[1].id))

    # 5. Take top `limit`
    selected_questions = [sq[1] for sq in scored_questions[:limit]]

    # Ensure no duplicates (though the ID sort guarantees stability and uniqueness)
    return selected_questions
