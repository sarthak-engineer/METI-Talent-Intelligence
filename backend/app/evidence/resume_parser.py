import fitz
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path


def _extract_docx_text(file_path: str) -> str:
    with zipfile.ZipFile(file_path) as z:
        xml_content = z.read("word/document.xml")
    tree = ET.fromstring(xml_content)
    namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    paragraphs = []
    for p in tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
        texts = [node.text for node in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
        if texts:
            paragraphs.append("".join(texts))
    return "\n\n".join(paragraphs)


def extract_resume_text(file_path: str) -> str:
    """
    Extract text from a PDF, DOCX, or TXT resume.
    """
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"Resume not found: {file_path}")

    ext = path.suffix.lower()

    if ext == ".pdf":
        document = fitz.open(file_path)
        pages = []
        for page in document:
            text = page.get_text("text")
            if text.strip():
                pages.append(text.strip())
        document.close()
        return "\n\n".join(pages)

    if ext == ".docx":
        return _extract_docx_text(file_path)

    if ext in {".txt", ".md"}:
        return path.read_text(encoding="utf-8", errors="ignore")

    raise ValueError(f"Unsupported resume format: {ext}. Supported formats are PDF, DOCX, and TXT.")
