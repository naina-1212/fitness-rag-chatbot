"""
FastAPI backend for the Fitness Coach RAG chatbot.

Run locally with:
    uvicorn app.main:app --reload --port 8000

Exposes:
    GET  /api/stats  -> corpus stats (documents, chunks, provider)
    POST /api/chat    -> streaming, citation-grounded chat response
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.generate import retrieve_chunks, build_user_message, _stream_llm, get_system_prompt, build_agent_user_message, get_agent_system_prompt, LLM_PROVIDER
from app.retrieval import get_corpus_stats
from app.search import search_ddg

app = FastAPI(title="Fitness Coach API")

# Allow the React frontend (local dev + deployed) to call this API.
# In production, set FRONTEND_ORIGIN to your actual Vercel/Netlify URL.
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN] if FRONTEND_ORIGIN != "*" else ["*"],
    allow_credentials=FRONTEND_ORIGIN != "*",
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    query: str
    top_k: int = 6
    mode: str = "coach"  # "beginner" | "coach" | "researcher"
    model_type: str = "rag"  # "rag" | "agent"


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/stats")
def stats():
    try:
        s = get_corpus_stats()
        return {**s, "provider": LLM_PROVIDER}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Knowledge base not ready: {e}")


@app.post("/api/chat")
def chat(req: ChatRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    if req.model_type == "agent":
        search_results = search_ddg(req.query, max_results=5)
        user_message = build_agent_user_message(req.query, search_results)
        system_prompt = get_agent_system_prompt(req.mode)
        
        sources_payload = [
            {
                "title": r["title"],
                "source_type": r["source_type"],
                "year": r["year"],
                "url": r["url"],
            }
            for r in search_results
        ]
    else:
        chunks = retrieve_chunks(req.query, top_k=req.top_k)
        user_message = build_user_message(req.query, chunks)
        system_prompt = get_system_prompt(req.mode)
        
        sources_payload = [
            {
                "title": c["metadata"]["title"],
                "source_type": c["metadata"]["source_type"],
                "year": c["metadata"]["year"],
                "url": c["metadata"].get("url", ""),
            }
            for c in chunks
        ]

    def event_stream():
        import json
        try:
            # de-dupe by title while preserving order
            seen = set()
            deduped = []
            for s in sources_payload:
                if s["title"] not in seen:
                    seen.add(s["title"])
                    deduped.append(s)

            yield f"__SOURCES__{json.dumps(deduped)}\n"

            for delta in _stream_llm(system_prompt, user_message):
                yield delta
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"\n\n⚠️ Backend error: {e}"

    return StreamingResponse(event_stream(), media_type="text/plain")
