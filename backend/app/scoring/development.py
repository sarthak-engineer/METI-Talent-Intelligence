from typing import List, Dict, Any

from app.assessment.questions import COMPETENCIES


COMPETENCY_NAMES = {
    competency.id: competency.name
    for competency in COMPETENCIES
}


def _competency_name(competency_id: str) -> str:
    return COMPETENCY_NAMES.get(
        competency_id,
        competency_id,
    )


def _action_for_gap(
    gap_type: str,
    competency_name: str,
) -> tuple[str, str, str]:
    if gap_type == "EVIDENCE_GAP":
        return (
            (
                f"Complete a structured consulting scenario or practical exercise to generate evidence for {competency_name}."
            ),
            (
                "One scored consulting scenario response or validated artifact."
            ),
            (
                "Demonstrate the competency in a new work sample "
                "or assessment with sufficient-confidence evidence."
            ),
        )

    return (
        (
            f"Practice a consulting scenario or case study focusing on {competency_name}."
        ),
        (
            f"Produce a scored consulting response or validated work sample demonstrating {competency_name} at the required level."
        ),
        (
            "Increase the competency score to meet or exceed "
            "the target role requirement in a subsequent assessment."
        ),
    )


def build_development_plan(
    evaluations: List[Dict[str, Any]],
    role_intelligence: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Build an explainable development plan from deterministic
    role requirements and competency evidence.

    Important distinction:

    EVIDENCE_GAP:
        The role requires the competency, but there is no
        evaluation/evidence available for it.

    CAPABILITY_GAP:
        The competency has evidence and an evaluation, but
        the current score is below the role requirement.

    Development planning does not infer lack of ability from
    missing evidence.
    """

    if not role_intelligence:
        return {
            "target_role": None,
            "priority_count": 0,
            "priorities": [],
            "actions": [],
        }

    evaluation_map = {
        evaluation["competency_id"]: evaluation
        for evaluation in evaluations
    }

    priorities: List[Dict[str, Any]] = []

    # role_intelligence is ordered by the role-readiness pipeline.
    # The first role is therefore the current primary target role.
    target_role = role_intelligence[0]

    # IMPORTANT:
    # role_intelligence contains the role's actual requirements.
    # We use those requirements directly instead of parsing
    # human-readable blocking-gap strings.
    requirements = target_role.get("requirements", [])

    for requirement in requirements:
        competency_id = requirement["competency_id"]
        required_level = requirement["required_level"]

        evaluation = evaluation_map.get(competency_id)

        is_evidence_gap = (
            evaluation is None 
            or float(evaluation.get("confidence", 0.0)) == 0.0
        )

        # ---------------------------------------------------------
        # CASE 1: No evaluation or 0 confidence -> EVIDENCE GAP
        # ---------------------------------------------------------
        if is_evidence_gap:
            gap_type = "EVIDENCE_GAP"

            competency_name = _competency_name(
                competency_id
            )

            recommended_action, evidence_to_produce, success_measure = (
                _action_for_gap(
                    gap_type,
                    competency_name,
                )
            )

            priorities.append(
                {
                    "role_id": target_role["role_id"],
                    "role_name": target_role["role_name"],
                    "competency_id": competency_id,
                    "competency_name": competency_name,
                    "gap_type": gap_type,
                    "current_score": None,
                    "required_level": required_level,
                    "gap": None,
                    "confidence": 0.0,
                    "evidence_ids": [],
                    "priority": "HIGH",
                    "why_it_matters": (
                        f"{competency_name} is currently a "
                        f"blocking requirement for the "
                        f"{target_role['role_name']} role, "
                        "but there is insufficient evidence "
                        "to assess it."
                    ),
                    "recommended_action": recommended_action,
                    "evidence_to_produce": evidence_to_produce,
                    "success_measure": success_measure,
                }
            )

            continue

        # ---------------------------------------------------------
        # CASE 2: Evaluation exists but score is below requirement
        # -> CAPABILITY GAP
        # ---------------------------------------------------------
        current_score = float(
            evaluation.get("score", 0.0)
        )

        if current_score < required_level:
            gap_type = "CAPABILITY_GAP"

            gap = round(
                required_level - current_score,
                2,
            )

            competency_name = _competency_name(
                competency_id
            )

            if current_score < 50:
                priority = "HIGH"
            elif current_score < 65:
                priority = "MEDIUM"
            else:
                priority = "LOW"

            recommended_action, evidence_to_produce, success_measure = (
                _action_for_gap(
                    gap_type,
                    competency_name,
                )
            )

            priorities.append(
                {
                    "role_id": target_role["role_id"],
                    "role_name": target_role["role_name"],
                    "competency_id": competency_id,
                    "competency_name": competency_name,
                    "gap_type": gap_type,
                    "current_score": current_score,
                    "required_level": required_level,
                    "gap": gap,
                    "confidence": evaluation.get(
                        "confidence",
                        0.0,
                    ),
                    "evidence_ids": evaluation.get(
                        "evidence_ids",
                        [],
                    ),
                    "priority": priority,
                    "why_it_matters": (
                        f"{competency_name} is "
                        f"{gap:.1f} points below the "
                        f"required level for the "
                        f"{target_role['role_name']} role."
                    ),
                    "recommended_action": recommended_action,
                    "evidence_to_produce": evidence_to_produce,
                    "success_measure": success_measure,
                }
            )

    # -------------------------------------------------------------
    # Sort:
    # 1. Evidence gaps first.
    # 2. Then largest capability gaps first.
    # -------------------------------------------------------------
    priorities.sort(
        key=lambda item: (
            0 if item["gap_type"] == "EVIDENCE_GAP" else 1,
            -(
                item["gap"]
                if item["gap_type"] == "CAPABILITY_GAP"
                and item["gap"] is not None
                else 0
            ),
        )
    )

    # Keep the roadmap focused.
    priorities = priorities[:5]

    actions = [
        {
            "step": index + 1,
            "competency_id": priority["competency_id"],
            "competency_name": priority["competency_name"],
            "gap_type": priority["gap_type"],
            "priority": priority["priority"],
            "action": priority["recommended_action"],
            "evidence_to_produce": priority.get("evidence_to_produce", ""),
            "success_measure": priority["success_measure"],
        }
        for index, priority in enumerate(priorities)
    ]

    return {
        "target_role": target_role,
        "priority_count": len(priorities),
        "priorities": priorities,
        "actions": actions,
    }
