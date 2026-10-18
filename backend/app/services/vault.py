"""Encrypted document storage helpers."""
import io
import re

from cryptography.fernet import Fernet
from pypdf import PdfReader

from app.core.config import settings

MAX_TEXT_CHARS = 100_000
MAX_PDF_PAGES = 50


def get_fernet() -> Fernet | None:
    if not settings.encryption_key:
        return None
    try:
        return Fernet(settings.encryption_key.encode())
    except (ValueError, TypeError):
        return None


def sniff_type(data: bytes) -> str | None:
    """Return the content type from the file's first bytes (not from its name), or None if not allowed."""
    if data.startswith(b"%PDF-"):
        return "application/pdf"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    return None


def extract_text(data: bytes, content_type: str) -> str:
    """Text from a PDF. Images give no text (no OCR). Never raises."""
    if content_type != "application/pdf":
        return ""
    try:
        reader = PdfReader(io.BytesIO(data))
        parts = []
        for page in reader.pages[:MAX_PDF_PAGES]:
            parts.append(page.extract_text() or "")
            if sum(map(len, parts)) > MAX_TEXT_CHARS:
                break
        return re.sub(r"[ \t]+", " ", "\n".join(parts)).strip()[:MAX_TEXT_CHARS]
    except Exception:
        return ""


def safe_filename(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9._ -]", "_", name).strip(" .")[:100] or "document"


def search_excerpts(text: str, query: str, width: int = 350, limit: int = 3) -> tuple[int, list[str]]:
    """Simple keyword search. Returns (score, excerpts around the first matches)."""
    words = {w for w in re.findall(r"[a-z0-9\-]{3,}", query.lower())}
    if not words or not text:
        return 0, []
    low = text.lower()
    score = sum(low.count(w) for w in words)
    spots = sorted({low.find(w) for w in words if w in low})[:limit]
    return score, [text[max(0, i - width // 2): i + width // 2].replace("\n", " ").strip() for i in spots]
