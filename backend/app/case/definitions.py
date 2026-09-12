from pydantic import BaseModel
from typing import List, Optional


class CaseRubricDimension(BaseModel):
    competency_id: str
    description: str


class ConsultingCase(BaseModel):
    case_id: str
    title: str
    role_id: str
    scenario: str
    instructions: str
    expected_competency_ids: List[str]
    evaluation_rubric: List[CaseRubricDimension]
    version: str = "v1.0"


CONSULTING_CASES = [
    ConsultingCase(
        case_id="case-ai-trans-01",
        title="GenAI Customer Operations Transformation",
        role_id="role-ai-transformation-consultant",
        scenario="A large telecommunications company wants to introduce Generative AI into their customer operations. They have high call volumes, low customer satisfaction, and aging legacy CRM systems. The board is pushing for AI adoption, but the operations team is concerned about risks, hallucination, and job displacement.",
        instructions="Please provide a structured assessment of this situation. Discuss the business value, potential risks, transformation implications, operating considerations, and a recommended implementation approach.",
        expected_competency_ids=["C12", "C08", "C04", "C01", "C15"],
        evaluation_rubric=[
            CaseRubricDimension(competency_id="C12", description="Assesses enterprise AI transformation awareness and practical implications."),
            CaseRubricDimension(competency_id="C08", description="Evaluates ability to design a coherent transformation and implementation approach."),
            CaseRubricDimension(competency_id="C04", description="Checks understanding of the customer service value chain and operational impact."),
            CaseRubricDimension(competency_id="C01", description="Assesses strategic alignment and enterprise value thinking."),
            CaseRubricDimension(competency_id="C15", description="Evaluates written executive communication and structure."),
        ],
    ),
    ConsultingCase(
        case_id="case-ai-ml-01",
        title="Production ML Value Realization",
        role_id="role-ai-ml-consultant",
        scenario="A predictive maintenance ML solution at a manufacturing firm performed exceptionally well during a 3-month proof-of-concept testing phase (92% accuracy). However, six months after deployment into production, the business sponsor reports it is struggling to deliver the expected financial value, and maintenance costs remain unchanged.",
        instructions="Diagnose the likely causes for the discrepancy between testing performance and production value. Outline your methodology for investigating the issue and recommend an enterprise approach to remediate it.",
        expected_competency_ids=["C13", "C08", "C14", "C02", "C15"],
        evaluation_rubric=[
            CaseRubricDimension(competency_id="C13", description="Evaluates problem structuring and root cause hypothesis generation."),
            CaseRubricDimension(competency_id="C08", description="Assesses ability to recommend a transformation approach that connects models to operational processes."),
            CaseRubricDimension(competency_id="C14", description="Checks data/commercial thinking regarding why accuracy didn't translate to financial value."),
            CaseRubricDimension(competency_id="C02", description="Evaluates research and diagnostic insight methodology."),
            CaseRubricDimension(competency_id="C15", description="Evaluates written executive communication and structure."),
        ],
    ),
    ConsultingCase(
        case_id="case-bus-tech-01",
        title="Operating Cost & Process Transformation",
        role_id="role-business-technology-consultant",
        scenario="A mid-sized retail bank has seen its operating costs rise by 15% over two years. Concurrently, a core process—loan origination—is notoriously slow, taking an average of 14 days compared to the market average of 4 days. Staff complain about manual data entry across multiple disconnected systems.",
        instructions="Structure this problem. Identify the likely root causes driving the high costs and slow processing times, and recommend a structured transformation approach to address these challenges.",
        expected_competency_ids=["C13", "C06", "C04", "C09", "C15"],
        evaluation_rubric=[
            CaseRubricDimension(competency_id="C13", description="Evaluates problem structuring and logical breakdown of the issue."),
            CaseRubricDimension(competency_id="C06", description="Assesses understanding of process efficiency, capability bottlenecks, and automation opportunities."),
            CaseRubricDimension(competency_id="C04", description="Checks understanding of the loan origination value chain."),
            CaseRubricDimension(competency_id="C09", description="Evaluates consideration for change adoption and staff impact."),
            CaseRubricDimension(competency_id="C15", description="Evaluates written executive communication and structure."),
        ],
    )
]


def get_case_by_role(role_id: str) -> Optional[ConsultingCase]:
    for case in CONSULTING_CASES:
        if case.role_id == role_id:
            return case
    return None


def get_case_by_id(case_id: str) -> Optional[ConsultingCase]:
    for case in CONSULTING_CASES:
        if case.case_id == case_id:
            return case
    return None
