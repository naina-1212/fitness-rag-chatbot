"""
Retrieval module: embeds a user query and pulls the most relevant chunks
from the Chroma collection built by ingestion/build_vectorstore.py.
"""

from pathlib import Path
import chromadb
from sentence_transformers import SentenceTransformer

CHROMA_PATH = Path(__file__).parent.parent / "data" / "processed" / "chroma_db"
COLLECTION_NAME = "fitness_evidence"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

_model = None
_client = None
_collection = None


def _get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def _get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=str(CHROMA_PATH))
        _collection = _client.get_collection(COLLECTION_NAME)
    return _collection


def retrieve(query: str, top_k: int = 6) -> list[dict]:
    """Return the top_k most relevant chunks for a query, each with its
    text and source metadata (title, url, source_type, etc.)."""
    model = _get_model()
    collection = _get_collection()

    query_embedding = model.encode([query]).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
    )

    chunks = []
    for i in range(len(results["ids"][0])):
        chunks.append(
            {
                "text": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i],
            }
        )
    return chunks


def get_corpus_stats() -> dict:
    """Returns basic stats about the knowledge base for display in the UI
    (total chunks, unique source documents, breakdown by source type)."""
    collection = _get_collection()
    total_chunks = collection.count()

    # Pull all metadata to compute unique sources / type breakdown.
    # Fine at this corpus size (hundreds of chunks); would need pagination
    # at much larger scale.
    all_data = collection.get(include=["metadatas"])
    metadatas = all_data["metadatas"]

    unique_titles = {m["title"] for m in metadatas}
    source_types = {}
    for m in metadatas:
        st = m.get("source_type", "unknown")
        source_types[st] = source_types.get(st, 0) + 1

    return {
        "total_chunks": total_chunks,
        "unique_sources": len(unique_titles),
        "source_type_breakdown": source_types,
    }


if __name__ == "__main__":
    # Quick manual test: run `python app/retrieval.py` and type a query
    import sys

    query = " ".join(sys.argv[1:]) or "How much protein do I need after a workout?"
    print(f"Query: {query}\n")
    results = retrieve(query, top_k=5)
    for i, r in enumerate(results):
        meta = r["metadata"]
        print(f"[{i+1}] {meta['title']} ({meta['source_type']}, {meta['year']}) — distance={r['distance']:.3f}")
        print(f"    {r['text'][:150]}...")
        print()
