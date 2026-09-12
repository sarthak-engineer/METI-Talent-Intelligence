import json
from pathlib import Path
from typing import Any, Dict, List, Optional


DATA_DIR = Path(__file__).resolve().parents[2] / "data"
INTERVIEWS_FILE = DATA_DIR / "interviews.json"


def _ensure_store() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if not INTERVIEWS_FILE.exists():
        INTERVIEWS_FILE.write_text("[]", encoding="utf-8")


def _load_interviews() -> List[Dict[str, Any]]:
    _ensure_store()

    try:
        data = json.loads(
            INTERVIEWS_FILE.read_text(encoding="utf-8")
        )

        if isinstance(data, list):
            return data

    except (json.JSONDecodeError, OSError):
        pass

    return []


def _save_interviews(
    interviews: List[Dict[str, Any]]
) -> None:
    _ensure_store()

    INTERVIEWS_FILE.write_text(
        json.dumps(
            interviews,
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )


def create_interview(
    interview_id: str,
    candidate_id: str,
    attempt_id: Optional[str],
    questions: List[Dict[str, Any]],
    pathway: Optional[str] = None,
) -> Dict[str, Any]:

    interviews = _load_interviews()

    interview = {
        "id": interview_id,
        "candidate_id": candidate_id,
        "attempt_id": attempt_id,
        "pathway": pathway,
        "status": "in_progress",
        "questions": questions,
        "answers": [],
    }

    interviews.append(interview)

    _save_interviews(interviews)

    return interview


def get_interview(
    interview_id: str,
) -> Optional[Dict[str, Any]]:

    interviews = _load_interviews()

    for interview in interviews:
        if interview.get("id") == interview_id:
            return interview

    return None


def get_candidate_interviews(
    candidate_id: str,
) -> List[Dict[str, Any]]:

    interviews = _load_interviews()

    return [
        interview
        for interview in interviews
        if interview.get("candidate_id") == candidate_id
    ]


def add_answer(
    interview_id: str,
    question_id: str,
    answer: str,
) -> Optional[Dict[str, Any]]:

    interviews = _load_interviews()

    for interview in interviews:

        if interview.get("id") != interview_id:
            continue

        answers = interview.setdefault(
            "answers",
            [],
        )

        answers.append(
            {
                "question_id": question_id,
                "answer": answer,
            }
        )

        _save_interviews(interviews)

        return interview

    return None


def complete_interview(
    interview_id: str,
) -> Optional[Dict[str, Any]]:

    interviews = _load_interviews()

    for interview in interviews:

        if interview.get("id") != interview_id:
            continue

        interview["status"] = "completed"

        _save_interviews(interviews)

        return interview

    return None
