"""
FastAPI backend for the Fitness Coach RAG chatbot.

Run locally with:
    uvicorn app.main:app --reload --port 8000

Exposes:
    GET  /api/stats  -> corpus stats (documents, chunks, provider)
    POST /api/chat    -> streaming, citation-grounded chat response
"""

import os
import re
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.generate import retrieve_chunks, build_user_message, add_user_document_context, _stream_llm, get_system_prompt, build_agent_user_message, get_agent_system_prompt, LLM_PROVIDER
from app.retrieval import get_corpus_stats
from app.search import search_trusted_sources
from app.auth import authenticate_user, create_session, create_user, current_user, delete_session, initialize_auth_store
from app.chat_history import delete_conversation, initialize_chat_history_store, list_conversations, save_conversation
from app.user_documents import create_document, delete_document, initialize_user_document_store, list_documents, retrieve_document_chunks

app = FastAPI(title="Fitness Coach API")
initialize_auth_store()
initialize_chat_history_store()
initialize_user_document_store()

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
    document_ids: list[int] = Field(default_factory=list)


class SignUpRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ConversationMessage(BaseModel):
    role: str
    content: str
    sources: list[dict] = []


class ConversationRequest(BaseModel):
    id: str
    title: str = "New Chat"
    messages: list[ConversationMessage] = []
    mode: str = "coach"
    modelType: str = "rag"
    searchWeb: bool = True
    documentIds: list[int] = Field(default_factory=list)
    timestamp: int


def bearer_token(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.removeprefix("Bearer ").strip() or None


def authenticated_user(authorization: str | None):
    user = current_user(bearer_token(authorization))
    if not user:
        raise HTTPException(status_code=401, detail="Please sign in to continue.")
    return user


def session_response(user):
    return {"access_token": create_session(user), "token_type": "bearer", "user": user}


@app.post("/api/auth/signup", status_code=201)
def signup(payload: SignUpRequest):
    name, email, password = payload.name.strip(), payload.email.strip(), payload.password
    if not name:
        raise HTTPException(status_code=422, detail="Name is required.")
    if "@" not in email or len(email) > 254:
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    if len(password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")
    try:
        return session_response(create_user(name, email, password))
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error


@app.post("/api/auth/login")
def login(payload: LoginRequest):
    user = authenticate_user(payload.email.strip(), payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return session_response(user)


@app.post("/api/auth/logout", status_code=204)
def logout(authorization: str | None = Header(default=None)):
    delete_session(bearer_token(authorization))


@app.post("/api/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    # An email delivery provider is intentionally not implied by this local app.
    # Keeping the response neutral prevents account enumeration.
    if "@" not in payload.email:
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    return {"message": "If an account exists, reset instructions will be sent when email delivery is configured."}


@app.get("/api/conversations")
def conversations(authorization: str | None = Header(default=None)):
    user = authenticated_user(authorization)
    return list_conversations(user["id"])


@app.put("/api/conversations/{conversation_id}")
def upsert_conversation(conversation_id: str, payload: ConversationRequest,
                        authorization: str | None = Header(default=None)):
    user = authenticated_user(authorization)
    if payload.id != conversation_id:
        raise HTTPException(status_code=400, detail="Conversation ID does not match the URL.")
    if not save_conversation(user["id"], payload.model_dump()):
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return {"ok": True}


@app.delete("/api/conversations/{conversation_id}", status_code=204)
def remove_conversation(conversation_id: str, authorization: str | None = Header(default=None)):
    user = authenticated_user(authorization)
    if not delete_conversation(user["id"], conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found.")


@app.get("/api/documents")
def documents(authorization: str | None = Header(default=None)):
    user = authenticated_user(authorization)
    return list_documents(user["id"])


@app.post("/api/documents", status_code=201)
async def upload_document(file: UploadFile = File(...), authorization: str | None = Header(default=None)):
    user = authenticated_user(authorization)
    try:
        return create_document(user["id"], file.filename or "document", file.content_type or "", await file.read())
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.delete("/api/documents/{document_id}", status_code=204)
def remove_document(document_id: int, authorization: str | None = Header(default=None)):
    user = authenticated_user(authorization)
    if not delete_document(user["id"], document_id):
        raise HTTPException(status_code=404, detail="Document not found.")


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


def is_conversational(query: str) -> bool:
    if not query:
        return False
    # Strip all non-alphanumeric characters except spaces
    q = re.sub(r'[^\w\s]', '', query).strip().lower()
    
    # Common conversational phrases (without punctuation)
    conversational_phrases = {
        "hi", "hello", "hey", "hola", "yo", "greetings", "hi there", "hello there", "hey there",
        "how are you", "how are you doing", "how goes it", "hows it going", "how is it going", "hows life",
        "whats up", "what is up", "sup", "hows your day", "how is your day",
        "who are you", "what are you", "what is your name", "whats your name",
        "thank you", "thanks", "thank you so much", "thanks a lot", "thanks helper",
        "good morning", "good afternoon", "good evening",
        "goodbye", "bye", "see you", "see ya", "talk to you later",
        "ok", "okay", "cool", "great", "awesome", "perfect",
        "hello how are you", "hello how are you doing", "hey how are you", "hey how are you doing",
        "hi how are you", "hi how are you doing", "hello there how are you", "hello there how are you doing",
        "hey there how are you", "hey there how are you doing", "how are you today", "how are you doing today"
    }
    
    if q in conversational_phrases:
        return True
        
    # Check if the query is just composed entirely of greeting/particle words
    words = q.split()
    if not words:
        return False
        
    greetings_and_particles = {
        "hi", "hello", "hey", "yo", "greetings", "good", "morning", "afternoon", "evening", "howdy",
        "how", "who", "are", "you", "doing", "up", "whats", "what", "is", "your", "name", "thanks", "thank",
        "bye", "goodbye", "there", "going", "it", "to", "day", "life", "ok", "okay", "cool", "great", "awesome", "perfect",
        "fine", "well", "im", "i", "am", "doing", "very", "much", "and", "self", "today"
    }
    
    if all(w in greetings_and_particles for w in words):
        return True
            
    return False


@app.post("/api/chat")
def chat(req: ChatRequest, authorization: str | None = Header(default=None)):
    user = authenticated_user(authorization)
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
    try:
        document_chunks = retrieve_document_chunks(user["id"], req.document_ids, query)
    except PermissionError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    is_conv = is_conversational(query)
    
    # A selected upload is intentionally document-first.  This lets people ask
    # about their own plans and reports even when the shared vector store has
    # not been built, and avoids mixing unrelated public results into an
    # extraction request.
    use_document_only_context = bool(document_chunks)

    if req.model_type == "agent":
        if req.search_web and not is_conv and not use_document_only_context:
            search_results = search_trusted_sources(query, max_results=5)
            grounded_content = build_agent_user_message(query, search_results)
            sources_payload = [
                {
                    "title": result["title"],
                    "source_type": result["source_type"],
                    "publisher": result.get("publisher", "Trusted source"),
                    "year": result["year"],
                    "url": result["url"],
                }
                for result in search_results
            ]
        else:
            grounded_content = query
            sources_payload = []
        
        system_prompt = get_agent_system_prompt(req.mode)
    else:
        if not is_conv and not use_document_only_context:
            chunks = retrieve_chunks(query, top_k=req.top_k)
            # Blend local studies with current guidance from official bodies.
            # This makes the research mode more useful even before the curated
            # guidance collection has been rebuilt locally.
            trusted_results = search_trusted_sources(query, max_results=3)
            grounded_content = build_user_message(query, chunks, trusted_results)
            sources_payload = [
                {
                    "title": c["metadata"]["title"],
                    "source_type": c["metadata"]["source_type"],
                    "publisher": c["metadata"].get("publisher", "PubMed" if c["metadata"]["source_type"] == "pubmed" else ""),
                    "year": c["metadata"]["year"],
                    "url": c["metadata"].get("url", ""),
                }
                for c in chunks
            ] + [
                {
                    "title": result["title"],
                    "source_type": result["source_type"],
                    "publisher": result.get("publisher", "Trusted source"),
                    "year": result["year"],
                    "url": result["url"],
                }
                for result in trusted_results
            ]
        else:
            grounded_content = query
            sources_payload = []
        system_prompt = get_system_prompt(req.mode)

    if document_chunks:
        grounded_content = add_user_document_context(grounded_content, document_chunks)
        sources_payload.extend([
            {
                "title": chunk["filename"], "source_type": "your document",
                "publisher": "Private upload", "year": "Uploaded", "url": "",
            }
            for chunk in document_chunks
        ])

    if is_conv:
        system_prompt += "\n\nNote: The user's message is a casual greeting, small talk, or simple acknowledgement. Keep your response extremely brief, warm, and natural (1-2 sentences max) and do not try to reference any research or search results."

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
