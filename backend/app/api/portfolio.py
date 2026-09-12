import base64
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.evidence.store import save_evidence
from app.models.schemas import EvidenceItem, EvidenceType
from app.evidence.confidence import EVIDENCE_CONFIDENCE


router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


GITHUB_API = "https://api.github.com"
GITHUB_TIMEOUT = 15.0
MAX_README_CHARS = 12000
MAX_FILE_CHARS = 4000
MAX_FILES = 8


class GitHubPortfolioRequest(BaseModel):
    candidate_id: str = Field(min_length=1)
    repo_url: str = Field(min_length=1)


def parse_github_repo_url(repo_url: str) -> tuple[str, str]:
    parsed = urlparse(repo_url.strip())

    if parsed.scheme not in {"http", "https"}:
        raise ValueError("GitHub repository URL must start with http:// or https://")

    if parsed.netloc.lower() not in {"github.com", "www.github.com"}:
        raise ValueError("Only github.com repository URLs are supported.")

    parts = [part for part in parsed.path.strip("/").split("/") if part]

    if len(parts) < 2:
        raise ValueError(
            "GitHub repository URL must look like "
            "https://github.com/owner/repository"
        )

    owner = parts[0]
    repo = parts[1]

    if repo.endswith(".git"):
        repo = repo[:-4]

    return owner, repo


def github_get(
    client: httpx.Client,
    endpoint: str,
    params: dict | None = None,
):
    response = client.get(
        f"{GITHUB_API}{endpoint}",
        params=params,
        headers={
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "METI-Talent-Intelligence",
        },
    )

    if response.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail="GitHub repository or requested resource was not found.",
        )

    if response.status_code == 403:
        raise HTTPException(
            status_code=429,
            detail="GitHub API rate limit reached. Please try again later.",
        )

    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"GitHub API returned HTTP {response.status_code}.",
        )

    return response.json()


def decode_github_content(content: dict) -> str:
    encoded = content.get("content", "")

    if not encoded:
        return ""

    try:
        return base64.b64decode(encoded).decode("utf-8", errors="replace")
    except Exception:
        return ""


def get_key_files(
    client: httpx.Client,
    owner: str,
    repo: str,
) -> list[dict]:
    contents = github_get(client, f"/repos/{owner}/{repo}/contents")

    if not isinstance(contents, list):
        return []

    candidate_files = [
        item
        for item in contents
        if item.get("type") == "file"
    ]

    preferred_names = {
        "README.md",
        "requirements.txt",
        "pyproject.toml",
        "package.json",
        "main.py",
        "app.py",
        "server.py",
        "Dockerfile",
    }

    candidate_files.sort(
        key=lambda item: (
            item.get("name") not in preferred_names,
            item.get("name", "").lower(),
        )
    )

    selected = []

    for item in candidate_files[:MAX_FILES]:
        path = item.get("path")

        if not path:
            continue

        try:
            file_data = github_get(
                client,
                f"/repos/{owner}/{repo}/contents/{path}",
            )
        except HTTPException:
            continue

        text = decode_github_content(file_data)

        if text:
            selected.append(
                {
                    "path": path,
                    "content": text[:MAX_FILE_CHARS],
                }
            )

    return selected


@router.post("/github")
def ingest_github_portfolio(request: GitHubPortfolioRequest):
    try:
        owner, repo = parse_github_repo_url(request.repo_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        with httpx.Client(timeout=GITHUB_TIMEOUT) as client:
            repository = github_get(
                client,
                f"/repos/{owner}/{repo}",
            )

            languages = github_get(
                client,
                f"/repos/{owner}/{repo}/languages",
            )

            readme = ""
            try:
                readme_data = github_get(
                    client,
                    f"/repos/{owner}/{repo}/readme",
                )
                readme = decode_github_content(readme_data)
            except HTTPException as exc:
                if exc.status_code != 404:
                    raise

            commits = github_get(
                client,
                f"/repos/{owner}/{repo}/commits",
                params={"per_page": 10},
            )

            key_files = get_key_files(
                client,
                owner,
                repo,
            )

    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=504,
            detail="GitHub request timed out.",
        ) from exc

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail="Could not connect to GitHub.",
        ) from exc

    commit_items = []

    if isinstance(commits, list):
        for commit in commits[:10]:
            commit_info = commit.get("commit", {})
            author = commit_info.get("author", {})

            commit_items.append(
                {
                    "sha": commit.get("sha"),
                    "message": commit_info.get("message", "")[:300],
                    "author": author.get("name"),
                    "date": author.get("date"),
                }
            )

    evidence_text = (
        f"Portfolio repository: {owner}/{repo}\n"
        f"Repository URL: {request.repo_url}\n"
        f"Description: {repository.get('description') or 'Not provided'}\n"
        f"Primary language: {repository.get('language') or 'Not specified'}\n"
        f"Languages: {', '.join(languages.keys()) if languages else 'Not available'}\n"
        f"Stars: {repository.get('stargazers_count', 0)}\n"
        f"Forks: {repository.get('forks_count', 0)}\n"
        f"Open issues: {repository.get('open_issues_count', 0)}\n"
        f"Default branch: {repository.get('default_branch') or 'Not available'}\n"
        f"Last updated: {repository.get('updated_at') or 'Not available'}\n\n"
        f"README:\n{readme[:MAX_README_CHARS]}\n\n"
        f"Recent commits:\n"
    )

    for commit in commit_items:
        evidence_text += (
            f"- {commit.get('date')}: "
            f"{commit.get('message', '')}\n"
        )

    evidence_text += "\nSelected repository files:\n"

    for file_item in key_files:
        evidence_text += (
            f"\n--- {file_item['path']} ---\n"
            f"{file_item['content']}\n"
        )

    evidence_id = f"GH-{owner}-{repo}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

    evidence = EvidenceItem(
        id=evidence_id,
        candidate_id=request.candidate_id,
        source=f"github:{owner}/{repo}",
        evidence_type=EvidenceType.VERIFIED_PORTFOLIO,
        text=evidence_text,
        competency_ids=[],
        confidence=EVIDENCE_CONFIDENCE[EvidenceType.VERIFIED_PORTFOLIO],
        created_at=datetime.now(timezone.utc),
        source_version="github-rest-v1",
    )

    save_evidence(evidence)

    return {
        "message": "GitHub portfolio evidence ingested successfully.",
        "evidence_id": evidence.id,
        "candidate_id": request.candidate_id,
        "repository": f"{owner}/{repo}",
        "source": evidence.source,
        "evidence_type": evidence.evidence_type.value,
        "source_confidence": evidence.confidence,
        "metadata": {
            "description": repository.get("description"),
            "primary_language": repository.get("language"),
            "languages": languages,
            "stars": repository.get("stargazers_count", 0),
            "forks": repository.get("forks_count", 0),
            "open_issues": repository.get("open_issues_count", 0),
            "default_branch": repository.get("default_branch"),
            "recent_commit_count": len(commit_items),
            "selected_file_count": len(key_files),
            "readme_available": bool(readme.strip()),
        },
    }
