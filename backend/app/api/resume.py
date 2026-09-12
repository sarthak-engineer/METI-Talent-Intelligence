from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.evidence.pipeline import process_resume


router = APIRouter(prefix="/resume", tags=["Resume"])


UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_resume(
    candidate_id: str,
    file: UploadFile = File(...),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required.",
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in {".pdf", ".docx", ".txt", ".md"}:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOCX, and TXT resumes are supported.",
        )

    safe_name = f"{uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / safe_name

    content = await file.read()

    # Basic upload-size protection for the prototype.
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Resume exceeds the 10 MB limit.",
        )

    file_path.write_bytes(content)

    try:
        evidence = process_resume(
            candidate_id=candidate_id,
            file_path=str(file_path),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to process resume: {exc}",
        ) from exc

    return {
        "candidate_id": candidate_id,
        "filename": file.filename,
        "evidence_count": len(evidence),
        "evidence": [
            item.model_dump(mode="json")
            for item in evidence
        ],
    }
