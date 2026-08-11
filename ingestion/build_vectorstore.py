"""
Loads PubMed, guideline, and curated official-guidance JSON documents,
chunks them, embeds them locally with
sentence-transformers, and stores them in a persistent Chroma collection.

Usage:
    python ingestion/build_vectorstore.py
"""

import json
import uuid
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer

DATA_DIR = Path(__file__).parent.parent / "data" / "processed"
CHROMA_PATH = DATA_DIR / "chroma_db"
COLLECTION_NAME = "fitness_evidence"

EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # small, fast, good enough for this scale
CHUNK_SIZE = 800       # characters per chunk
CHUNK_OVERLAP = 150    # characters of overlap between chunks


def load_all_docs() -> list[dict]:
    docs = []
    for fname in ["pubmed_docs.json", "guideline_docs.json", "trusted_guidance_docs.json"]:
        path = DATA_DIR / fname
        if path.exists():
            with open(path) as f:
                docs.extend(json.load(f))
        else:
            print(f"Note: {fname} not found, skipping (run its fetch script first)")
    return docs


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Simple sliding-window chunker on characters, breaking on paragraph
    boundaries where possible so chunks stay coherent."""
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]

        # try to break at the last paragraph/sentence boundary in the window
        if end < len(text):
            last_break = max(chunk.rfind("\n\n"), chunk.rfind(". "))
            if last_break > chunk_size * 0.5:  # only trim if it doesn't waste too much
                chunk = chunk[: last_break + 1]

        chunks.append(chunk.strip())
        start += len(chunk) - overlap if len(chunk) > overlap else len(chunk)

    return [c for c in chunks if c]


def main():
    docs = load_all_docs()
    if not docs:
        print("No documents found. Run fetch_pubmed.py and/or load_guidelines.py first.")
        return

    print(f"Loaded {len(docs)} source documents. Chunking...")

    chunk_records = []
    for doc in docs:
        chunks = chunk_text(doc["text"], CHUNK_SIZE, CHUNK_OVERLAP)
        for i, chunk in enumerate(chunks):
            chunk_records.append(
                {
                    "id": str(uuid.uuid4()),
                    "text": chunk,
                    "metadata": {
                        "source_type": doc["source_type"],
                        "publisher": doc.get("publisher", "PubMed" if doc["source_type"] == "pubmed" else ""),
                        "title": doc["title"],
                        "year": doc.get("year", "n.d."),
                        "topic": doc.get("topic", ""),
                        "url": doc.get("url", ""),
                        "chunk_index": i,
                    },
                }
            )

    print(f"Created {len(chunk_records)} chunks. Loading embedding model ({EMBEDDING_MODEL})...")
    model = SentenceTransformer(EMBEDDING_MODEL)

    print("Embedding chunks (this may take a minute)...")
    texts = [r["text"] for r in chunk_records]
    embeddings = model.encode(texts, show_progress_bar=True, batch_size=32).tolist()

    print("Writing to Chroma...")
    client = chromadb.PersistentClient(path=str(CHROMA_PATH))
    # Fresh collection each build so re-running doesn't duplicate data
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    collection = client.create_collection(COLLECTION_NAME)

    # Chroma wants batches under ~5000; our scale is small so one add() is fine,
    # but we batch anyway to be safe for larger corpora later.
    BATCH = 500
    for i in range(0, len(chunk_records), BATCH):
        batch = chunk_records[i : i + BATCH]
        collection.add(
            ids=[r["id"] for r in batch],
            documents=[r["text"] for r in batch],
            embeddings=embeddings[i : i + BATCH],
            metadatas=[r["metadata"] for r in batch],
        )

    print(f"\nDone. {collection.count()} chunks stored in Chroma at {CHROMA_PATH}")


if __name__ == "__main__":
    main()
