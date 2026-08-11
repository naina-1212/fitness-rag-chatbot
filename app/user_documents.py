"""Private user-document extraction and retrieval for PulseFit."""

import io
import re
import zipfile
from datetime import UTC, datetime
from pathlib import Path
from xml.etree import ElementTree

from pypdf import PdfReader

from app.auth import _connection

MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_TEXT_CHARS = 150_000
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".csv"}


def initialize_user_document_store():
    with _connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS user_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                content_type TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                extracted_text TEXT NOT NULL,
                uploaded_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_user_documents_user ON user_documents(user_id);
            """
        )


def extract_text(filename: str, content: bytes) -> str:
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Upload a PDF, DOCX, TXT, Markdown, or CSV file.")

    if extension == ".pdf":
        try:
            reader = PdfReader(io.BytesIO(content))
            text = "\n\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as error:
            raise ValueError("This PDF could not be read. Try a text-based, unencrypted PDF.") from error
    elif extension == ".docx":
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                document_xml = archive.read("word/document.xml")
            root = ElementTree.fromstring(document_xml)
        except (KeyError, zipfile.BadZipFile, ElementTree.ParseError) as error:
            raise ValueError("This DOCX file does not contain readable document text.") from error
        paragraphs = []
        namespace = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
        for paragraph in root.iter(f"{namespace}p"):
            paragraphs.append("".join(node.text or "" for node in paragraph.iter(f"{namespace}t")))
        text = "\n".join(paragraphs)
    else:
        text = content.decode("utf-8", errors="replace")

    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not text:
        raise ValueError("No readable text was found in this document.")
    return text[:MAX_TEXT_CHARS]


def create_document(user_id: int, filename: str, content_type: str, content: bytes) -> dict:
    if len(content) > MAX_FILE_BYTES:
        raise ValueError("Documents must be 10 MB or smaller.")
    safe_filename = Path(filename or "document").name
    text = extract_text(safe_filename, content)
    with _connection() as connection:
        cursor = connection.execute(
            """INSERT INTO user_documents
               (user_id, filename, content_type, size_bytes, extracted_text, uploaded_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, safe_filename, content_type or "application/octet-stream", len(content), text,
             datetime.now(UTC).isoformat()),
        )
    return {"id": cursor.lastrowid, "filename": safe_filename, "size_bytes": len(content),
            "text_length": len(text)}


def list_documents(user_id: int) -> list[dict]:
    with _connection() as connection:
        rows = connection.execute(
            """SELECT id, filename, size_bytes, uploaded_at, length(extracted_text) AS text_length
               FROM user_documents WHERE user_id = ? ORDER BY uploaded_at DESC""",
            (user_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def delete_document(user_id: int, document_id: int) -> bool:
    with _connection() as connection:
        cursor = connection.execute(
            "DELETE FROM user_documents WHERE id = ? AND user_id = ?", (document_id, user_id)
        )
    return cursor.rowcount > 0


def retrieve_document_chunks(user_id: int, document_ids: list[int], query: str, limit: int = 4) -> list[dict]:
    """Return relevant excerpts from documents owned by the signed-in user."""
    if not document_ids:
        return []
    placeholders = ",".join("?" for _ in document_ids)
    with _connection() as connection:
        rows = connection.execute(
            f"""SELECT id, filename, extracted_text FROM user_documents
                WHERE user_id = ? AND id IN ({placeholders})""",
            (user_id, *document_ids),
        ).fetchall()

    if len(rows) != len(set(document_ids)):
        raise PermissionError("One or more selected documents are unavailable.")

    # Use overlapping, paragraph-aware passages so an answer can include the
    # heading or surrounding detail that gives a matching sentence meaning.
    # This intentionally stays dependency-free: uploads should work even when
    # the shared fitness vector store has not been built.
    query_terms = {term.lower() for term in re.findall(r"[a-zA-Z0-9]{3,}", query)}
    scored = []
    for row in rows:
        text = row["extracted_text"]
        passages = [paragraph.strip() for paragraph in re.split(r"\n\s*\n", text) if paragraph.strip()]
        if not passages:
            passages = [text]
        for paragraph_index, passage in enumerate(passages):
            # Large paragraphs are broken into overlapping windows; short
            # paragraphs remain intact for clearer, more complete answers.
            windows = [passage] if len(passage) <= 1500 else [
                passage[start:start + 1500] for start in range(0, len(passage), 1100)
            ]
            for window_index, excerpt in enumerate(windows):
                words = {term.lower() for term in re.findall(r"[a-zA-Z0-9]{3,}", excerpt)}
                score = len(query_terms & words)
                # Prefer passages containing more of the user's terms, then
                # earlier passages for predictable results when scores tie.
                position = paragraph_index * 10_000 + window_index
                scored.append((score, position, row["id"], row["filename"], excerpt))

    scored.sort(key=lambda item: (item[0], -item[1]), reverse=True)
    return [
        {"id": document_id, "filename": filename, "text": excerpt}
        for _, _, document_id, filename, excerpt in scored[:limit]
    ]
