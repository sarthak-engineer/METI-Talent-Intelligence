from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class EvidenceType(str, Enum):
    SELF_REPORT = "self_report"
    STRUCTURED_SCENARIO = "structured_scenario"
    WRITTEN_RESPONSE = "written_response"
    VERIFIED_PORTFOLIO = "verified_portfolio"
    CONSULTING_RESPONSE = "consulting_response"
    CASE_WORK_SAMPLE = "case_work_sample"
    HUMAN_REVIEW = "human_review"


class TargetPathway(str, Enum):
    AI_TRANSFORMATION = "role-ai-transformation-consultant"
    AI_ML = "role-ai-ml-consultant"
    BUSINESS_TECHNOLOGY = "role-business-technology-consultant"
    EXPLORING = "exploring"


class EvidenceItem(BaseModel):
    id: str
    candidate_id: str
    source: str
    evidence_type: EvidenceType
    text: str
    competency_ids: List[str] = Field(default_factory=list)
    canonical_competency_ids: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    created_at: datetime
    source_version: str = "v1"
    attempt_id: Optional[str] = None
    question_id: Optional[str] = None
    pathway: Optional[str] = None
    category: Optional[str] = None
    source_evidence_ids: List[str] = Field(default_factory=list)
    evidence_to_verify: Optional[str] = None


class CompetencyEvaluation(BaseModel):
    competency_id: str
    score: float = Field(ge=0.0, le=100.0)
    confidence: float = Field(ge=0.0, le=1.0)

    evidence_ids: List[str] = Field(default_factory=list)

    # Explainability
    rationale: str = ""
    evidence_summary: List[str] = Field(default_factory=list)

    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    flags: List[str] = Field(default_factory=list)


class CandidateScore(BaseModel):
    candidate_id: str
    competency_scores: List[CompetencyEvaluation]
    cci: float = Field(ge=0.0, le=100.0)
    evidence_confidence: float = Field(ge=0.0, le=1.0)
    scoring_version: str = "v1.0"


class RoleRequirement(BaseModel):
    competency_id: str
    required_level: float = Field(ge=0.0, le=100.0)
    weight: float = Field(ge=0.0, le=1.0)


class RoleProfile(BaseModel):
    id: str
    name: str
    requirements: List[RoleRequirement]
    version: str = "v1.0"


class RoleMatch(BaseModel):
    role_id: str
    role_name: str
    match_score: float = Field(ge=0.0, le=100.0)
    gaps: List[str] = Field(default_factory=list)


class ClaimEvidence(BaseModel):
    claim: str
    evidence_ids: List[str] = Field(default_factory=list)

    relationship: str = "NOT_SUPPORTED"

    confidence: float = Field(ge=0.0, le=1.0)

    explanation: Optional[str] = None


# ============================================================
# METI PLATFORM LIFECYCLE CONTRACTS
# ============================================================

class AssessmentAttempt(BaseModel):
    """
    Immutable assessment attempt.

    A new attempt is created for every reassessment.
    Previous attempts and their evidence are never overwritten.
    """

    id: str
    candidate_id: str

    assessment_version: str = "v1.0"
    attempt_number: int = Field(ge=1)

    status: str = "in_progress"

    # Evidence generated during this attempt.
    evidence_ids: List[str] = Field(default_factory=list)

    # Previous attempt, if this is a reassessment.
    previous_attempt_id: Optional[str] = None

    started_at: datetime
    completed_at: Optional[datetime] = None


class AnalysisSnapshot(BaseModel):
    """
    Immutable result of analysing one assessment attempt.

    LLM interpretation is captured here, while deterministic
    business metrics are calculated by the scoring engine.
    """

    id: str
    candidate_id: str
    attempt_id: str

    evaluations: List[CompetencyEvaluation] = Field(
        default_factory=list
    )

    cci: float = Field(ge=0.0, le=100.0)
    evidence_coverage: float = Field(ge=0.0, le=1.0)
    evidence_confidence: float = Field(ge=0.0, le=1.0)

    role_matches: List[RoleMatch] = Field(
        default_factory=list
    )

    role_readiness: List[dict] = Field(
        default_factory=list
    )

    development_plan: dict = Field(
        default_factory=dict
    )

    scoring_version: str = "v1.0"
    analysis_version: str = "snapshot-1.0"

    created_at: datetime


class ReviewReason(str, Enum):
    LOW_EVIDENCE_CONFIDENCE = "low_evidence_confidence"
    CLIENT_FACING_ROLE = "client_facing_role"
    INTEGRITY_CONFLICT = "integrity_conflict"
    CRITICAL_FLAG = "critical_flag"


class ReviewDecision(BaseModel):
    """
    Deterministic decision describing whether human review is required.

    Human review is conditional — it is not part of every candidate's
    standard journey.
    """

    id: str
    candidate_id: str
    analysis_snapshot_id: str

    review_required: bool
    reasons: List[ReviewReason] = Field(
        default_factory=list
    )

    status: str = "pending"

    reviewer_id: Optional[str] = None
    reviewer_notes: Optional[str] = None

    created_at: datetime
    reviewed_at: Optional[datetime] = None


class Entitlement(BaseModel):
    """
    Product access state.

    Summary findings are always available.
    Detailed report access is controlled separately.
    """

    candidate_id: str

    summary_access: bool = True
    detailed_report_access: bool = False

    product_version: str = "v1.0"

    updated_at: datetime


class CandidateProfile(BaseModel):
    """
    Candidate onboarding profile record.
    """

    candidate_id: str
    full_name: str
    email: str
    current_role: Optional[str] = ""
    years_experience: Optional[int] = 0
    location: Optional[str] = ""
    industry: Optional[str] = ""
    target_pathway: str = "role-ai-transformation-consultant"
    created_at: datetime = Field(
        default_factory=lambda: datetime.now()
    )


