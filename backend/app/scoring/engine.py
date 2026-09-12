from collections import defaultdict
from typing import List

from app.assessment.questions import COMPETENCIES
from app.models.schemas import CompetencyEvaluation


def calculate_cci(evaluations):
    """
    Calculate CCI using all evaluations for each competency.

    Multiple evidence sources for the same competency are combined
    using their evaluation confidence.
    """

    competency_evaluations = defaultdict(list)

    for evaluation in evaluations:
        competency_evaluations[evaluation.competency_id].append(evaluation)

    weighted_score = 0.0
    total_weight = 0.0

    for competency in COMPETENCIES:
        evidence = competency_evaluations.get(competency.id)

        if not evidence:
            continue

        confidence_sum = sum(
            evaluation.confidence
            for evaluation in evidence
        )

        if confidence_sum == 0:
            continue

        combined_score = sum(
            evaluation.score * evaluation.confidence
            for evaluation in evidence
        ) / confidence_sum

        weighted_score += combined_score * competency.weight
        total_weight += competency.weight

    if total_weight == 0:
        return 0.0

    return round(weighted_score / total_weight, 2)


def calculate_evidence_coverage(evidence_items):
    """
    Calculate evidence coverage from the actual evidence-to-competency mapping
    stored on EvidenceItem.

    Coverage represents the proportion of the METI competency framework
    for which the candidate has at least one piece of evidence.

    The LLM's decision to emit or omit an evaluation must not determine
    evidence coverage.
    """

    if not evidence_items:
        return 0.0

    evidenced_competencies = {
        competency_id
        for evidence in evidence_items
        for competency_id in evidence.competency_ids
    }

    covered_weight = sum(
        competency.weight
        for competency in COMPETENCIES
        if competency.id in evidenced_competencies
    )

    total_weight = sum(
        competency.weight
        for competency in COMPETENCIES
    )

    if total_weight == 0:
        return 0.0

    return round(
        covered_weight / total_weight,
        3,
    )


def calculate_evidence_confidence(evidence_items, evaluations):
    """
    Calculate evidence confidence using both:

    1. The inherent confidence of the evidence source
       (defined by the METI evidence-confidence framework).
    2. The LLM's confidence in interpreting that evidence.

    The LLM does not define the underlying reliability of a
    source. It only contributes confidence in its interpretation.

    Final evidence confidence is weighted by competency importance.
    """

    if not evidence_items or not evaluations:
        return 0.0

    from app.evidence.confidence import get_evidence_confidence

    evidence_map = {
        evidence.id: evidence
        for evidence in evidence_items
    }

    competency_map = {
        competency.id: competency
        for competency in COMPETENCIES
    }

    competency_confidences = defaultdict(list)

    for evaluation in evaluations:
        competency_id = evaluation.competency_id

        if competency_id not in competency_map:
            continue

        if not evaluation.evidence_ids:
            continue

        for evidence_id in evaluation.evidence_ids:
            evidence = evidence_map.get(evidence_id)

            if evidence is None:
                continue

            source_confidence = get_evidence_confidence(
                evidence.evidence_type
            )

            model_confidence = max(
                0.0,
                min(1.0, evaluation.confidence)
            )

            combined_confidence = (
                source_confidence * model_confidence
            )

            competency_confidences[
                competency_id
            ].append(combined_confidence)

    weighted_confidence = 0.0
    total_weight = 0.0

    for competency in COMPETENCIES:
        confidences = competency_confidences.get(
            competency.id
        )

        if not confidences:
            continue

        combined_confidence = min(
            1.0,
            sum(confidences) / len(confidences)
        )

        weighted_confidence += (
            combined_confidence * competency.weight
        )

        total_weight += competency.weight

    if total_weight == 0:
        return 0.0

    return round(
        weighted_confidence / total_weight,
        3
    )
