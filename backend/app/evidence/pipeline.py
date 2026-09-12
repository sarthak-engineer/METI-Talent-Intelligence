from datetime import datetime, timezone
from uuid import uuid4

import re

from app.api.portfolio import ingest_github_portfolio, GitHubPortfolioRequest
from app.evidence.confidence import get_evidence_confidence
from app.evidence.resume_parser import extract_resume_text
from app.evidence.segmenter import segment_resume
from app.evidence.store import save_evidence
from app.models.schemas import EvidenceItem, EvidenceType


def process_resume(
    candidate_id: str,
    file_path: str,
) -> list[EvidenceItem]:
    """
    Convert a resume into traceable evidence items.
    """

    text = extract_resume_text(file_path)

    segments = segment_resume(text)

    evidence_items = []

    for segment in segments:
        evidence = EvidenceItem(
            id=f"E-{uuid4().hex[:8]}",
            candidate_id=candidate_id,
            source="resume",
            evidence_type=EvidenceType.SELF_REPORT,
            text=segment,
            competency_ids=[],
            confidence=get_evidence_confidence(
                EvidenceType.SELF_REPORT
            ),
            created_at=datetime.now(timezone.utc),
            source_version="resume-parser-v1",
        )

        save_evidence(evidence)
        evidence_items.append(evidence)

    # Extract GitHub URLs
    github_urls = re.findall(r'https?://(?:www\.)?github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', text)
    github_urls = list(set(github_urls))
    
    for url in github_urls:
        try:
            req = GitHubPortfolioRequest(candidate_id=candidate_id, repo_url=url)
            ingest_github_portfolio(req)
        except Exception:
            pass

    return evidence_items
