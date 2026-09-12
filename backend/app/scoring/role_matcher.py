from typing import List

from app.models.schemas import (
    CompetencyEvaluation,
    RoleMatch,
    RoleProfile,
)


def calculate_role_match(
    evaluations: List[CompetencyEvaluation],
    role: RoleProfile,
) -> RoleMatch:

    evaluation_map = {
        evaluation.competency_id: evaluation
        for evaluation in evaluations
    }

    weighted_score = 0.0

    total_weight = sum(
        requirement.weight
        for requirement in role.requirements
    )

    gaps = []

    for requirement in role.requirements:

        evaluation = evaluation_map.get(
            requirement.competency_id
        )

        # Missing evidence does NOT disappear from the denominator.
        if evaluation is None:

            gaps.append(
                f"{requirement.competency_id}: insufficient evidence"
            )

            continue

        score = evaluation.score

        # Capability relative to required role level.
        requirement_fit = min(
            score / requirement.required_level,
            1.0,
        )

        weighted_score += (
            requirement_fit * requirement.weight
        )

        if score < requirement.required_level:

            gap = (
                requirement.required_level
                - score
            )

            gaps.append(
                f"{requirement.competency_id}: "
                f"{gap:.1f} points below expected level"
            )

    if total_weight == 0:
        match_score = 0.0
    else:
        match_score = (
            weighted_score / total_weight
        ) * 100

    return RoleMatch(
        role_id=role.id,
        role_name=role.name,
        match_score=round(match_score, 2),
        gaps=gaps,
    )


def calculate_role_readiness(
    evaluations: List[CompetencyEvaluation],
    role: RoleProfile,
) -> dict:
    """
    Calculate deterministic role readiness.

    Role match measures weighted capability similarity.
    Readiness additionally considers:
      - mandatory competency thresholds
      - evidence availability
      - evidence confidence
      - critical evaluation flags

    The LLM does not make the readiness decision.
    """

    evaluation_map = {
        evaluation.competency_id: evaluation
        for evaluation in evaluations
    }

    required_count = len(role.requirements)

    if required_count == 0:
        return {
            "status": "INSUFFICIENT_EVIDENCE",
            "readiness_score": 0.0,
            "requirements_met": 0,
            "requirements_total": 0,
            "confidence": 0.0,
            "blocking_gaps": [],
        }

    requirements_met = 0
    confidence_values = []
    blocking_gaps = []
    critical_flags = []

    for requirement in role.requirements:

        evaluation = evaluation_map.get(
            requirement.competency_id
        )

        if evaluation is None:

            blocking_gaps.append(
                f"{requirement.competency_id}: insufficient evidence"
            )

            continue

        confidence_values.append(
            evaluation.confidence
        )

        if evaluation.flags:
            critical_flags.extend(
                [
                    f"{requirement.competency_id}: {flag}"
                    for flag in evaluation.flags
                ]
            )

        if evaluation.score >= requirement.required_level:
            requirements_met += 1
        else:

            gap = (
                requirement.required_level
                - evaluation.score
            )

            blocking_gaps.append(
                f"{requirement.competency_id}: "
                f"{gap:.1f} points below expected level"
            )

    requirement_coverage = (
        requirements_met / required_count
    ) * 100

    average_confidence = (
        sum(confidence_values)
        / len(confidence_values)
        if confidence_values
        else 0.0
    )

    # Readiness is intentionally conservative:
    # capability coverage is the primary signal,
    # evidence confidence acts as a modifier.
    readiness_score = (
        requirement_coverage
        * average_confidence
    )

    if critical_flags:
        status = "HUMAN_REVIEW_REQUIRED"

    elif requirements_met == required_count:
        if average_confidence >= 0.70:
            status = "READY"
        else:
            status = "READY_WITH_LOW_EVIDENCE_CONFIDENCE"

    elif requirement_coverage >= 70:
        status = "READY_WITH_DEVELOPMENT"

    else:
        status = "DEVELOPING"

    return {
        "status": status,
        "readiness_score": round(
            readiness_score,
            2,
        ),
        "requirements_met": requirements_met,
        "requirements_total": required_count,
        "confidence": round(
            average_confidence,
            3,
        ),
        "blocking_gaps": blocking_gaps,
        "critical_flags": critical_flags,
        "role_id": role.id,
        "role_name": role.name,
        "requirements": [
            {
                "competency_id": requirement.competency_id,
                "required_level": requirement.required_level,
                "weight": requirement.weight,
            }
            for requirement in role.requirements
        ],
    }


def match_all_roles(
    evaluations: List[CompetencyEvaluation],
    roles: List[RoleProfile],
) -> List[RoleMatch]:

    matches = [
        calculate_role_match(
            evaluations,
            role,
        )
        for role in roles
    ]

    return sorted(
        matches,
        key=lambda match: match.match_score,
        reverse=True,
    )
