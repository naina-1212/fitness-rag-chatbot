# 🏋️ Evidence-Based Fitness Coach (RAG Chatbot)

An AI-powered fitness and nutrition assistant that provides **evidence-based recommendations** using **Retrieval-Augmented Generation (RAG)**.

Instead of relying only on an LLM's pretrained knowledge, the chatbot retrieves relevant scientific literature from **PubMed** and official health guidelines such as **WHO** and **ACSM**, ensuring every response is grounded in reliable evidence and accompanied by supporting sources.

---

# ✨ Features

- 🔍 Retrieval-Augmented Generation (RAG)
- 📚 Scientific literature retrieval from PubMed
- 📄 Official WHO & ACSM guideline support
- 🤖 Dual LLM provider support
  - Groq (default)
  - Anthropic Claude (optional)
- 🧠 Semantic search using Sentence Transformers
- 💾 Persistent Chroma Vector Database
- 💬 Streaming AI responses
- 📖 Evidence-based answers with citations
- 🎯 Multiple explanation modes
  - Beginner
  - Coach
  - Researcher
- ⚡ FastAPI REST API
- ⚛️ React + Vite frontend

---

# 🏗️ Architecture

```text
                User
                  │
                  ▼
        React + Vite Frontend
                  │
             HTTP Request
                  │
                  ▼
           FastAPI Backend
                  │
                  ▼
        Retrieve Relevant Chunks
                  │
                  ▼
             Chroma Vector DB
                  │
                  ▼
      Scientific Evidence Chunks
                  │
                  ▼
         Groq / Anthropic LLM
                  │
                  ▼
      Citation-Grounded Response
                  │
                  ▼
              React UI
```

---

# 📂 Project Structure

```text
fitness-rag-chatbot/
│
├── app/                       # FastAPI backend & RAG pipeline
│   ├── main.py
│   ├── generate.py
│   ├── retrieval.py
│   └── __init__.py
│
├── ingestion/                 # Knowledge base creation
│   ├── fetch_pubmed.py
│   ├── load_guidelines.py
│   └── build_vectorstore.py
│
├── data/
│   ├── guidelines/
│   └── processed/
│       ├── chroma_db/
│       └── pubmed_docs.json
│
├── frontend/                  # React + Vite frontend
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

---

# 🛠️ Tech Stack

## Frontend

- React
- Vite
- CSS
- JavaScript

## Backend

- FastAPI
- Python

## AI & RAG

- Groq API (Default Provider)
- Anthropic Claude (Optional)
- Meta Llama 3.3 70B Versatile
- Sentence Transformers (`all-MiniLM-L6-v2`)
- ChromaDB

## Data Sources

- PubMed
- WHO Physical Activity Guidelines
- ACSM Position Stands

---

# ⚙️ Installation

## Clone the Repository

```bash
git clone https://github.com/naina-1212/fitness-rag-chatbot.git
cd fitness-rag-chatbot
```

---

## Create a Virtual Environment

```bash
python -m venv venv
```

### Windows

```bash
venv\Scripts\activate
```

### Linux / macOS

```bash
source venv/bin/activate
```

---

## Install Backend Dependencies

```bash
pip install -r requirements.txt
```

---

## Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

---

## Configure Environment Variables

Create a `.env` file using `.env.example`

```env
# Default Provider
GROQ_API_KEY=YOUR_GROQ_API_KEY
LLM_PROVIDER=groq

# Optional (Only required if using Anthropic)
ANTHROPIC_API_KEY=

# Optional PubMed API Key
NCBI_API_KEY=

# Chroma Database
CHROMA_DB_PATH=./data/processed/chroma_db
```

---

# 📚 Building the Knowledge Base

## Step 1 — Fetch Scientific Literature

```bash
python ingestion/fetch_pubmed.py
```

Downloads curated PubMed abstracts related to fitness and nutrition.

---

## Step 2 — Load Official Guidelines

Place guideline PDFs inside

```text
data/guidelines/
```

Examples include:

- WHO Physical Activity Guidelines
- ACSM Position Stands

Run:

```bash
python ingestion/load_guidelines.py
```

---

## Step 3 — Build the Vector Database

```bash
python ingestion/build_vectorstore.py
```

This process:

- Chunks documents
- Generates embeddings
- Stores vectors inside ChromaDB

The database will be created in:

```text
data/processed/chroma_db/
```

---

# ▶️ Running the Backend

```bash
uvicorn app.main:app --reload --port 8000
```

Backend

```text
http://localhost:8000
```

Interactive API Documentation

```text
http://localhost:8000/docs
```

---

# ▶️ Running the Frontend

```bash
cd frontend
npm run dev
```

Frontend

```text
http://localhost:5173
```

---

# 🧪 Testing

## Retrieval Only

```bash
python app/retrieval.py "How much protein should I consume after a workout?"
```

---

## Full RAG Pipeline

```bash
python app/generate.py "How much protein should I consume after a workout?"
```

---

# 📌 Current Status

## ✅ Completed

- Project architecture
- PubMed abstract ingestion
- Guideline PDF ingestion
- Document chunking
- Semantic embeddings
- Chroma vector database
- Retrieval pipeline
- Retrieval-Augmented Generation
- Dual LLM provider support (Groq & Anthropic)
- Streaming AI responses
- FastAPI backend
- React frontend
- Citation-grounded responses

---

## 🚧 Planned Features

- User authentication
- User profiles
- Personalized recommendations
- TDEE calculator
- Macro calculator
- Chat history
- Conversation memory
- Evaluation pipeline (Naive LLM vs RAG)
- Docker support
- Cloud deployment

---

# 💡 Why This Project?

Many AI fitness assistants rely solely on the language model's internal knowledge, which can lead to inaccurate or unsupported recommendations.

This project improves reliability by combining:

- Scientific evidence retrieval
- Official health guidelines
- Retrieval-Augmented Generation (RAG)
- Citation-grounded AI responses

By retrieving relevant research before generating an answer, the chatbot produces transparent, evidence-based recommendations rather than relying solely on model memory.

---

# 🔮 Future Improvements

- Multi-turn conversational memory
- Personalized fitness coaching
- Nutrition tracking
- Workout planning
- Wearable device integration
- Voice assistant
- Multi-language support
- Evaluation dashboard

---

# 📸 Demo

Coming Soon

- UI screenshots
- Demo GIF
- Live deployment

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new branch
3. Commit your changes
4. Push your branch
5. Open a Pull Request

---

# 📄 License

This project is licensed under the MIT License.

---

# 👩‍💻 Author

**Naina Awan**

Computer Science Student • AI & Full Stack Developer

GitHub: **https://github.com/naina-1212**
