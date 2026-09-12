from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Set

from app.assessment.ontology import (
    get_canonical_competency,
    map_canonical_to_composite,
)


class QuestionType(str, Enum):
    SINGLE_CHOICE = "single_choice"
    SCENARIO = "scenario"
    RANKED = "ranked"
    FREE_TEXT = "free_text"


@dataclass(frozen=True)
class QuestionOption:
    id: str
    text: str


@dataclass(frozen=True)
class DiagnosticQuestion:
    id: str
    question: str
    question_type: QuestionType
    canonical_competency_ids: List[str]
    estimated_minutes: int
    required: bool = True
    options: Optional[List[QuestionOption]] = None
    scoring_notes: str = ""
    applicable_role_ids: List[str] = field(default_factory=list)
    priority: int = 1

    @property
    def composite_competency_ids(self) -> List[str]:
        composite_ids: Set[str] = set()
        for canonical_id in self.canonical_competency_ids:
            mappings = map_canonical_to_composite(canonical_id)
            for m in mappings:
                composite_ids.add(m.composite_id)
        return sorted(list(composite_ids))


DIAGNOSTIC_QUESTIONS: List[DiagnosticQuestion] = [
    DiagnosticQuestion(
        id="Q01",
        question="Client has three initiatives but limited budget. Which is the strongest first step?",
        question_type=QuestionType.SINGLE_CHOICE,
        canonical_competency_ids=["C01"],
        estimated_minutes=2,
        options=[
            QuestionOption(id="opt1", text="Assess alignment with strategic objectives and financial ROI."),
            QuestionOption(id="opt2", text="Implement the cheapest initiative immediately for quick wins."),
            QuestionOption(id="opt3", text="Wait until the next fiscal year to execute any initiatives."),
        ],
        scoring_notes="Evaluates ability to prioritise based on strategic and financial value.",
        applicable_role_ids=["role-ai-transformation-consultant", "role-business-technology-consultant"],
        priority=5
    ),
    DiagnosticQuestion(
        id="Q02",
        question="A client says revenue has fallen 12%. Describe the first 3 things you would investigate before proposing a solution.",
        question_type=QuestionType.SCENARIO,
        canonical_competency_ids=["C03", "C13"],
        estimated_minutes=5,
        scoring_notes="Evaluates problem structuring and enterprise analysis approach.",
        applicable_role_ids=["role-ai-transformation-consultant", "role-business-technology-consultant"],
        priority=5
    ),
    DiagnosticQuestion(
        id="Q03",
        question="A business has high customer complaints concentrated around onboarding. Explain how you would analyse the value chain to identify where intervention is needed.",
        question_type=QuestionType.SCENARIO,
        canonical_competency_ids=["C04"],
        estimated_minutes=5,
        scoring_notes="Evaluates value chain transformation and root cause analysis.",
        applicable_role_ids=["role-ai-transformation-consultant", "role-business-technology-consultant", "role-ai-ml-consultant"],
        priority=4
    ),
    DiagnosticQuestion(
        id="Q04",
        question="A process has multiple manual handoffs and inconsistent ownership. What would you assess before redesigning it?",
        question_type=QuestionType.SCENARIO,
        canonical_competency_ids=["C06", "C07"],
        estimated_minutes=5,
        scoring_notes="Evaluates process, capability, and operating model thinking.",
        applicable_role_ids=["role-business-technology-consultant"],
        priority=4
    ),
    DiagnosticQuestion(
        id="Q05",
        question="A transformation programme has strong executive sponsorship but poor adoption. What would you investigate and what would you change?",
        question_type=QuestionType.SCENARIO,
        canonical_competency_ids=["C08", "C09"],
        estimated_minutes=5,
        scoring_notes="Evaluates transformation design and change management.",
        applicable_role_ids=["role-ai-transformation-consultant", "role-ai-ml-consultant"],
        priority=5
    ),
    DiagnosticQuestion(
        id="Q06",
        question="A client wants to deploy GenAI into customer service. What would you assess before recommending implementation?",
        question_type=QuestionType.SCENARIO,
        canonical_competency_ids=["C12"],
        estimated_minutes=5,
        scoring_notes="Evaluates enterprise AI transformation awareness and strategic assessment.",
        applicable_role_ids=["role-ai-transformation-consultant", "role-ai-ml-consultant"],
        priority=5
    ),
    DiagnosticQuestion(
        id="Q07",
        question='A client gives you a vague problem: "Our operations are too expensive." Explain how you would structure the problem.',
        question_type=QuestionType.FREE_TEXT,
        canonical_competency_ids=["C13"],
        estimated_minutes=5,
        scoring_notes="Evaluates independent problem structuring.",
        applicable_role_ids=[],
        priority=3
    ),
    DiagnosticQuestion(
        id="Q08",
        question="Rank the following considerations when deciding whether a proposed transformation initiative should proceed:",
        question_type=QuestionType.RANKED,
        canonical_competency_ids=["C14", "C01"],
        estimated_minutes=3,
        options=[
            QuestionOption(id="opt1", text="customer value"),
            QuestionOption(id="opt2", text="implementation feasibility"),
            QuestionOption(id="opt3", text="expected financial impact"),
            QuestionOption(id="opt4", text="strategic alignment"),
            QuestionOption(id="opt5", text="risk / compliance"),
        ],
        scoring_notes="Evaluates data, commercial thinking and strategic priorities.",
        applicable_role_ids=["role-ai-ml-consultant"],
        priority=4
    ),
    DiagnosticQuestion(
        id="Q09",
        question="A senior stakeholder strongly disagrees with your recommendation and wants a different approach. How would you handle the situation?",
        question_type=QuestionType.SCENARIO,
        canonical_competency_ids=["C16", "C19"],
        estimated_minutes=5,
        scoring_notes="Evaluates stakeholder management, facilitation, and leadership.",
        applicable_role_ids=["role-ai-transformation-consultant", "role-business-technology-consultant"],
        priority=4
    ),
    DiagnosticQuestion(
        id="Q10",
        question="Write a short executive update explaining that a transformation initiative is behind schedule, including the issue, impact, action and decision required.",
        question_type=QuestionType.FREE_TEXT,
        canonical_competency_ids=["C15"],
        estimated_minutes=5,
        scoring_notes="Evaluates written executive communication.",
        applicable_role_ids=[],
        priority=3
    ),
    DiagnosticQuestion(
        id="Q11",
        question="You discover that the evidence supporting your recommendation is weaker than you initially believed. What would you do?",
        question_type=QuestionType.FREE_TEXT,
        canonical_competency_ids=["C17"],
        estimated_minutes=3,
        scoring_notes="Evaluates professional judgement and integrity.",
        applicable_role_ids=[],
        priority=2
    ),
    DiagnosticQuestion(
        id="Q12",
        question="You are assigned to a consulting problem in an unfamiliar industry with limited prior knowledge. How would you approach the first week?",
        question_type=QuestionType.SCENARIO,
        canonical_competency_ids=["C18", "C20"],
        estimated_minutes=5,
        scoring_notes="Evaluates learning agility, adaptability, and cross-cultural/international consulting mindset.",
        applicable_role_ids=["role-ai-ml-consultant"],
        priority=2
    ),
]


def get_diagnostic_questions() -> List[DiagnosticQuestion]:
    return DIAGNOSTIC_QUESTIONS


def get_diagnostic_question(question_id: str) -> Optional[DiagnosticQuestion]:
    return next((q for q in DIAGNOSTIC_QUESTIONS if q.id == question_id), None)


def validate_diagnostic_questions() -> bool:
    if len(DIAGNOSTIC_QUESTIONS) != 12:
        raise ValueError(
            f"Expected exactly 12 diagnostic questions, found {len(DIAGNOSTIC_QUESTIONS)}"
        )

    seen_ids = set()
    for q in DIAGNOSTIC_QUESTIONS:
        if q.id in seen_ids:
            raise ValueError(f"Duplicate question ID found: {q.id}")
        seen_ids.add(q.id)

        if not q.required:
            raise ValueError(f"Question {q.id} must be required.")

        if q.estimated_minutes <= 0:
            raise ValueError(f"Question {q.id} must have estimated time > 0.")

        if not q.canonical_competency_ids:
            raise ValueError(
                f"Question {q.id} must have at least one canonical competency."
            )

        for canon_id in q.canonical_competency_ids:
            if not get_canonical_competency(canon_id):
                raise ValueError(
                    f"Question {q.id} references unknown canonical competency {canon_id}"
                )

        if not q.composite_competency_ids:
            raise ValueError(
                f"Question {q.id} has no derived composite mappings."
            )

        if q.question_type in {QuestionType.SINGLE_CHOICE, QuestionType.RANKED}:
            if not q.options:
                raise ValueError(
                    f"Question {q.id} of type {q.question_type} must have options."
                )

            seen_opts = set()
            for opt in q.options:
                if opt.id in seen_opts:
                    raise ValueError(
                        f"Question {q.id} has duplicate option ID: {opt.id}"
                    )
                seen_opts.add(opt.id)

            if q.question_type == QuestionType.RANKED and len(q.options) < 3:
                raise ValueError(
                    f"Ranked question {q.id} must have at least 3 options."
                )

        if q.question_type == QuestionType.FREE_TEXT:
            if q.options:
                raise ValueError(
                    f"Free-text question {q.id} must not have options."
                )

    return True


if __name__ == "__main__":
    validate_diagnostic_questions()
    print(f"Diagnostic question count: {len(DIAGNOSTIC_QUESTIONS)}")
    print("Diagnostic validation successful.")
