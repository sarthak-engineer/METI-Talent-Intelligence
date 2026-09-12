from fastapi import APIRouter, HTTPException

from app.agents.portfolio_intelligence import PortfolioIntelligenceAgent
from app.evidence.store import get_candidate_evidence
from app.evidence.portfolio_store import (
    save_portfolio_intelligence,
)
from app.evidence.synthesis import (
    summarize_claim_evidence,
)
from app.models.schemas import EvidenceType
from app.evidence.consistency import check_consistency
from app.evidence.evidence_confidence import calculate_evidence_confidence


router = APIRouter(
    prefix="/portfolio",
    tags=["Portfolio"],
)


@router.post("/intelligence/{candidate_id}")
def analyze_portfolio_intelligence(
    candidate_id: str,
):

    evidence = get_candidate_evidence(candidate_id)

    if not evidence:
        raise HTTPException(
            status_code=404,
            detail="No evidence found for this candidate.",
        )

def analyze_portfolio_intelligence_internal(candidate_id: str, evidence: list):
    portfolio = [
        item for item in evidence
        if item.evidence_type == EvidenceType.VERIFIED_PORTFOLIO
    ]
    claims = [
        item for item in evidence
        if item.evidence_type == EvidenceType.SELF_REPORT
    ]

    if not portfolio or not claims:
        return None

    agent = PortfolioIntelligenceAgent()
    results = agent.analyze(claims=claims, portfolio=portfolio)
    synthesis = summarize_claim_evidence(results)
    consistency = check_consistency(results)
    evidence_confidence = calculate_evidence_confidence(matrix=results, evidence_items=portfolio)
    saved_record = save_portfolio_intelligence(candidate_id=candidate_id, claim_evidence_matrix=results)
    
    return {
        "candidate_id": candidate_id,
        "portfolio_intelligence_id": saved_record["id"],
        "synthesis_version": saved_record["synthesis_version"],
        "claim_count": len(results),
        "portfolio_evidence_count": len(portfolio),
        "synthesis": synthesis,
        "consistency": consistency,
        "evidence_confidence": evidence_confidence,
        "claim_evidence_matrix": [result.model_dump() for result in results],
    }

@router.post("/intelligence/{candidate_id}")
def analyze_portfolio_intelligence(candidate_id: str):
    evidence = get_candidate_evidence(candidate_id)
    if not evidence:
        raise HTTPException(status_code=404, detail="No evidence found for this candidate.")
        
    portfolio = [item for item in evidence if item.evidence_type == EvidenceType.VERIFIED_PORTFOLIO]
    claims = [item for item in evidence if item.evidence_type == EvidenceType.SELF_REPORT]

    if not portfolio:
        raise HTTPException(status_code=404, detail="No GitHub or portfolio evidence found for this candidate.")
    if not claims:
        raise HTTPException(status_code=404, detail="No candidate claims found for this candidate.")

    return analyze_portfolio_intelligence_internal(candidate_id, evidence)


