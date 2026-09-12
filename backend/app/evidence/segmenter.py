from typing import List


def segment_resume(text: str, max_chars: int = 1200) -> List[str]:
    """
    Split resume text into manageable evidence segments.

    We prefer paragraph/section boundaries rather than blindly
    splitting every N characters.
    """

    if not text.strip():
        return []

    paragraphs = [
        paragraph.strip()
        for paragraph in text.split("\n")
        if paragraph.strip()
    ]

    segments = []
    current = ""

    for paragraph in paragraphs:
        if len(current) + len(paragraph) + 1 <= max_chars:
            current = f"{current}\n{paragraph}".strip()
        else:
            if current:
                segments.append(current)

            current = paragraph

    if current:
        segments.append(current)

    return segments
