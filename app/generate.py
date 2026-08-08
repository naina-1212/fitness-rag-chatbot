"""
Generation module: takes a user query + retrieved chunks, and calls an
LLM to produce a citation-grounded answer. Also exposes a
generate_naive() function (no retrieval) so we can compare naive vs
RAG answers for the eval step later.

Supports two providers, switchable via LLM_PROVIDER in .env:
  - "groq"      -> free tier, real hosted API, needs GROQ_API_KEY (default)
  - "anthropic" -> Claude API, needs ANTHROPIC_API_KEY + credit (best quality,
                   good for your final portfolio demo)
"""

import os
import requests
from dotenv import load_dotenv

from app.retrieval import retrieve

load_dotenv()

LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "groq")  # "groq" or "anthropic"

# --- Anthropic setup (only used if LLM_PROVIDER == "anthropic") ---
ANTHROPIC_MODEL = "claude-sonnet-4-6"
_anthropic_client = None


def _get_anthropic_client():
    global _anthropic_client
    if _anthropic_client is None:
        from anthropic import Anthropic
        _anthropic_client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    return _anthropic_client


# --- Groq setup (only used if LLM_PROVIDER == "groq") ---
# Groq exposes an OpenAI-compatible chat completions endpoint, so we can
# just hit it directly with requests -- no extra SDK needed.
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")


SYSTEM_PROMPT = """You are a friendly, knowledgeable fitness coach chatting with \
everyday people -- not writing a research paper. Answer in plain, simple \
language a beginner could understand: short sentences, no jargon, practical \
takeaways they can actually use.

You're given research excerpts below. Use them to ground your answer, but \
don't dump academic detail or list numbers/studies mid-sentence -- weave in \
what the research supports naturally, the way a coach who's done their \
homework would explain it to a friend.

Rules:
1. Keep answers short: a couple of sentences to one short paragraph, plus a \
quick practical takeaway if useful. Use a bullet list only if it genuinely \
makes something clearer (e.g. a few options), not by default.
2. Only use the excerpts provided -- don't pull in outside claims. If they \
don't clearly answer the question, say so simply and honestly, e.g. "There \
isn't strong research on that exact question in what I've got, but here's \
what's related..." -- never invent a number or fact to fill the gap.
3. If the research is mixed, say that in plain terms ("the research is a bit \
split on this") rather than listing both sides formally.
4. Skip inline [1][2]-style citation markers in the main answer -- write it \
clean, like a normal chat response. At the very end, add a short line like \
"Based on: <2-3 short paper topics>" so curious users can dig deeper, without \
cluttering the actual answer."""

# Explanation modes: same grounding rules, different voice/depth.
# Swapped in on top of the base SYSTEM_PROMPT below.
MODE_INSTRUCTIONS = {
    "beginner": (
        "\n\nVoice: Beginner mode. Assume zero background knowledge. Avoid "
        "any technical terms (or immediately explain them in plain words if "
        "you must use one). Keep it warm and encouraging."
    ),
    "coach": (
        "\n\nVoice: Coach mode (default). Practical, direct, and actionable "
        "-- like a trainer giving advice between sets. Light technical terms "
        "are fine if commonly known (e.g. 'reps', 'protein synthesis')."
    ),
    "researcher": (
        "\n\nVoice: Researcher mode. You can use proper scientific "
        "terminology and be more precise/technical, but keep the same "
        "length discipline -- this is not an academic abstract, just a more "
        "technically fluent version of the same short answer. You may "
        "reference study design details (sample size, population) briefly "
        "if relevant."
    ),
}


def get_system_prompt(mode: str = "coach") -> str:
    return SYSTEM_PROMPT + MODE_INSTRUCTIONS.get(mode, MODE_INSTRUCTIONS["coach"])


AGENT_SYSTEM_PROMPT = """You are a friendly, highly intelligent personal AI assistant and wellness coach. \
You help the user with any daily conversation, general questions, or fitness and nutrition advice. \
Behave like ChatGPT: be conversational, friendly, precise, and helpful. Use warm, encouraging, and clear language.

If web search context is provided below, ground your answer in it to give accurate, up-to-date details. \
If no search context is provided, answer using your general knowledge in a helpful and friendly way.

Rules:
1. Keep answers conversational, user-friendly, and structured. Use paragraphs, lists, or bold text naturally to make formatting elegant.
2. Answer precisely and directly. Do not reference academic studies formally or use citation markers like [1][2] in the text.
3. If you used web search results, at the very end of your response, add a short, clean line like: "Search results based on: <2-3 search topics>" to let the user know. If no search results were used, do NOT add this line.
"""

AGENT_MODE_INSTRUCTIONS = {
    "beginner": (
        "\n\nVoice: Beginner mode. Focus on fundamental principles, avoid technical jargon, and explain concepts simply."
    ),
    "coach": (
        "\n\nVoice: Coach mode. Direct, action-oriented advice, like a trainer helping someone execute their goals."
    ),
    "researcher": (
        "\n\nVoice: Researcher mode. Explain findings from the web searches using proper scientific reasoning or terminology, summarizing details cleanly."
    ),
}


def get_agent_system_prompt(mode: str = "coach") -> str:
    return AGENT_SYSTEM_PROMPT + AGENT_MODE_INSTRUCTIONS.get(mode, AGENT_MODE_INSTRUCTIONS["coach"])


def build_agent_user_message(query: str, search_results: list[dict]) -> str:
    context_lines = []
    for i, r in enumerate(search_results, start=1):
        context_lines.append(f"[{i}] Title: {r['title']}\nURL: {r['url']}\nSnippet: {r['snippet']}")
    context = "\n\n".join(context_lines)
    return f"""Question: {query}

Web Search Context:
{context}"""


def _format_context(chunks: list[dict]) -> str:
    lines = []
    for i, c in enumerate(chunks, start=1):
        meta = c["metadata"]
        lines.append(
            f"[{i}] {meta['title']} ({meta['source_type']}, {meta['year']})\n{c['text']}"
        )
    return "\n\n".join(lines)


def _call_llm(system: str, messages: list[dict] | str) -> str:
    """Routes to whichever provider is configured, supporting conversation history."""
    if isinstance(messages, str):
        messages_list = [{"role": "user", "content": messages}]
    else:
        messages_list = messages

    if LLM_PROVIDER == "anthropic":
        client = _get_anthropic_client()
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=1000,
            system=system,
            messages=messages_list,
        )
        return "".join(block.text for block in response.content if block.type == "text")

    elif LLM_PROVIDER == "groq":
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set in your .env file")

        response = requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    *messages_list,
                ],
                "temperature": 0.3,
            },
            timeout=60,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {LLM_PROVIDER}")


def _stream_llm(system: str, messages: list[dict] | str):
    """Generator version of _call_llm -- yields text chunks as they arrive,
    supporting conversation history."""
    if isinstance(messages, str):
        messages_list = [{"role": "user", "content": messages}]
    else:
        messages_list = messages

    if LLM_PROVIDER == "groq":
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set in your .env file")

        with requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    *messages_list,
                ],
                "temperature": 0.3,
                "stream": True,
            },
            stream=True,
            timeout=60,
        ) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if not line:
                    continue
                decoded = line.decode("utf-8")
                if not decoded.startswith("data: "):
                    continue
                payload = decoded[len("data: "):]
                if payload.strip() == "[DONE]":
                    break
                import json
                chunk = json.loads(payload)
                delta = chunk["choices"][0]["delta"].get("content")
                if delta:
                    yield delta

    elif LLM_PROVIDER == "anthropic":
        client = _get_anthropic_client()
        with client.messages.stream(
            model=ANTHROPIC_MODEL,
            max_tokens=1000,
            system=system,
            messages=messages_list,
        ) as stream:
            for text in stream.text_stream:
                yield text

    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {LLM_PROVIDER}")


def retrieve_chunks(query: str, top_k: int = 6) -> list[dict]:
    """Thin wrapper so the frontend doesn't need to import retrieval.py
    directly -- keeps the RAG pipeline's public surface in one place."""
    return retrieve(query, top_k=top_k)


def build_user_message(query: str, chunks: list[dict]) -> str:
    context = _format_context(chunks)
    return f"""Question: {query}

Source excerpts:
{context}"""


def stream_rag_answer(query: str, top_k: int = 6, mode: str = "coach"):
    """Retrieves chunks, then streams a citation-grounded answer.
    Yields text deltas; the caller can build the full string by joining
    them. Use retrieve_chunks() separately if you also want to display
    the raw sources (e.g. in a UI 'Sources' panel)."""
    chunks = retrieve_chunks(query, top_k=top_k)
    user_message = build_user_message(query, chunks)
    yield from _stream_llm(get_system_prompt(mode), user_message)


def generate_rag(query: str, top_k: int = 6) -> dict:
    """Full RAG pipeline: retrieve relevant chunks, then generate a
    citation-grounded answer. Returns the answer text plus the raw
    chunks used, so the frontend can show sourcesa separately if desired."""
    chunks = retrieve(query, top_k=top_k)
    context = _format_context(chunks)

    user_message = f"""Question: {query}

Source excerpts:
{context}"""

    answer_text = _call_llm(SYSTEM_PROMPT, user_message)

    return {
        "answer": answer_text,
        "chunks_used": chunks,
    }


def generate_naive(query: str) -> str:
    """No retrieval — plain LLM answer from general knowledge. Used
    for the naive-vs-RAG comparison in the eval step."""
    return _call_llm("You are a helpful fitness assistant.", query)


if __name__ == "__main__":
    import sys

    query = " ".join(sys.argv[1:]) or "How much protein do I need after a workout?"
    print(f"Query: {query}\nProvider: {LLM_PROVIDER}\n{'='*60}\n")

    result = generate_rag(query)
    print("RAG ANSWER:\n")
    print(result["answer"])