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


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    query: str = None
    messages: list[Message] = None
    top_k: int = 6
    mode: str = "coach"  # "beginner" | "coach" | "researcher"
    model_type: str = "rag"  # "rag" | "agent"
    search_web: bool = True


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
    # Determine current query
    query = req.query
    if not query and req.messages:
        # Find the last user message to use as current search query
        for msg in reversed(req.messages):
            if msg.role == "user":
                query = msg.content
                break

    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    sources_payload = []
    
    if req.model_type == "agent":
        if req.search_web:
            search_results = search_ddg(query, max_results=5)
            grounded_content = build_agent_user_message(query, search_results)
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
            grounded_content = query
            sources_payload = []
        
        system_prompt = get_agent_system_prompt(req.mode)
    else:
        chunks = retrieve_chunks(query, top_k=req.top_k)
        grounded_content = build_user_message(query, chunks)
        sources_payload = [
            {
                "title": c["metadata"]["title"],
                "source_type": c["metadata"]["source_type"],
                "year": c["metadata"]["year"],
                "url": c["metadata"].get("url", ""),
            }
            for c in chunks
        ]
        system_prompt = get_system_prompt(req.mode)

    # Build conversation payload for the LLM
    if req.messages:
        llm_messages = [{"role": m.role, "content": m.content} for m in req.messages]
        # Inject the grounded content (with context) into the last user message
        for i in range(len(llm_messages) - 1, -1, -1):
            if llm_messages[i]["role"] == "user":
                llm_messages[i]["content"] = grounded_content
                break
    else:
        llm_messages = [{"role": "user", "content": grounded_content}]

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

            for delta in _stream_llm(system_prompt, llm_messages):
                yield delta
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"\n\n⚠️ Backend error: {e}"

    return StreamingResponse(event_stream(), media_type="text/plain")
