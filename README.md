# Evidence-Based Fitness Coach (RAG Chatbot)

A chatbot that answers fitness/nutrition questions grounded in real
research (PubMed abstracts) and official guidelines (WHO, ACSM), with
every claim citing its source — instead of relying on an LLM's generic
(and sometimes wrong) training knowledge.

## Status: Day 3 of 7 — retrieval + generation

- [x] Project scaffold
- [x] PubMed abstract fetcher (`ingestion/fetch_pubmed.py`)
- [x] Guideline PDF loader (`ingestion/load_guidelines.py`)
- [x] Chunking + local embedding + Chroma vector store (`ingestion/build_vectorstore.py`)
- [x] Retrieval (`app/retrieval.py`) + Claude-generated, citation-grounded answers (`app/generate.py`)
- [ ] Agentic personalization layer (TDEE/macro calc + user profile)
- [ ] FastAPI backend
- [ ] Streamlit frontend
- [ ] Eval set: naive LLM vs RAG pipeline
- [ ] Deploy + demo GIF

## Test retrieval + generation directly (before the web layer exists)

```bash
# Retrieval only (no API key needed, just checks Chroma is working)
python app/retrieval.py how much protein do I need after a workout

# Full RAG answer (needs ANTHROPIC_API_KEY in .env)
python app/generate.py how much protein do I need after a workout
```

## Stack

- **Generation**: Claude API (Anthropic)
- **Embeddings**: `sentence-transformers` (local, `all-MiniLM-L6-v2` — free, no extra API key)
- **Vector store**: Chroma (persistent, local)
- **Backend**: FastAPI
- **Frontend**: Streamlit

## Setup

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # then add your ANTHROPIC_API_KEY
```

## Build the knowledge base

```bash
# 1. Fetch PubMed abstracts for the curated fitness subtopics
python ingestion/fetch_pubmed.py

# 2. (Optional but recommended) Drop guideline PDFs into data/guidelines/
#    e.g. WHO physical activity guidelines, ACSM position stands
python ingestion/load_guidelines.py

# 3. Chunk everything, embed it, and store it in Chroma
python ingestion/build_vectorstore.py
```

After this, you'll have a persistent Chroma collection at
`data/processed/chroma_db/` with your fitness evidence base ready for
retrieval.

## Why this project

Most "chat with your PDF" RAG demos are generic. Fitness/nutrition
advice is a domain where ungrounded LLM answers are a real risk (lots
of bro-science baked into training data), so citation-grounded
retrieval is solving an actual problem, not a toy one. The eval step
(naive LLM vs. RAG, on accuracy/citation-correctness) is what
separates this from a wrapper project.

## Notes on the PubMed fetcher

`ingestion/fetch_pubmed.py` uses NCBI's public E-utilities API — no key
required for light use (a few requests/second). If you hit rate limits,
get a free NCBI API key and add it as a query param to raise the limit
to 10 req/sec.
