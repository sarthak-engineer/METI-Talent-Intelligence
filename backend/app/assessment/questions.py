from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class Competency:
    id: str
    name: str
    weight: float
    description: str


COMPETENCIES: List[Competency] = [
    Competency(
        id="C01",
        name="Strategy & Enterprise Thinking",
        weight=0.10,
        description="Ability to think strategically and understand enterprise-level implications.",
    ),
    Competency(
        id="C02",
        name="Research & Insight",
        weight=0.08,
        description="Ability to research, interpret information and generate useful insights.",
    ),
    Competency(
        id="C03",
        name="Value Chain & Enterprise Analysis",
        weight=0.10,
        description="Ability to analyse value chains, business models and enterprise performance.",
    ),
    Competency(
        id="C04",
        name="Process, Capability & TOM",
        weight=0.10,
        description="Ability to analyse processes, capabilities and target operating models.",
    ),
    Competency(
        id="C05",
        name="Transformation & Change",
        weight=0.09,
        description="Ability to understand and structure transformation and organisational change.",
    ),
    Competency(
        id="C06",
        name="Organisation, Governance & Functional Design",
        weight=0.07,
        description="Ability to reason about organisation structures, governance and functional design.",
    ),
    Competency(
        id="C07",
        name="Programme, Portfolio & Benefits",
        weight=0.06,
        description="Ability to understand programme delivery, portfolios and benefits realisation.",
    ),
    Competency(
        id="C08",
        name="Enterprise AI Transformation Awareness",
        weight=0.05,
        description="Awareness of how AI can contribute to enterprise transformation.",
    ),
    Competency(
        id="C09",
        name="Problem Structuring & Commercial Thinking",
        weight=0.10,
        description="Ability to structure ambiguous problems and connect analysis to commercial outcomes.",
    ),
    Competency(
        id="C10",
        name="Executive Communication – Written",
        weight=0.07,
        description="Ability to communicate clearly and effectively in executive written formats.",
    ),
    Competency(
        id="C11",
        name="Executive Communication – Video",
        weight=0.07,
        description="Ability to communicate clearly and effectively through spoken/video responses.",
    ),
    Competency(
        id="C12",
        name="Stakeholder & Facilitation",
        weight=0.05,
        description="Ability to work with stakeholders and facilitate discussions effectively.",
    ),
    Competency(
        id="C13",
        name="Professional Judgement",
        weight=0.04,
        description="Ability to make balanced, evidence-based professional decisions.",
    ),
    Competency(
        id="C14",
        name="Learning Agility & Adaptability",
        weight=0.02,
        description="Ability to learn, adapt and improve based on feedback and new evidence.",
    ),
]


def get_competencies() -> List[Competency]:
    return COMPETENCIES


def get_competency(competency_id: str) -> Competency | None:
    return next(
        (competency for competency in COMPETENCIES if competency.id == competency_id),
        None,
    )


def validate_weights() -> bool:
    total = sum(c.weight for c in COMPETENCIES)
    return abs(total - 1.0) < 0.000001
