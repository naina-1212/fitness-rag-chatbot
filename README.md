# 🏋️ Evidence-Based Fitness Coach (RAG Chatbot)

An AI-powered fitness and nutrition assistant that delivers **evidence-based recommendations** by combining **Retrieval-Augmented Generation (RAG)** with scientific research from **PubMed** and official health guidelines such as **WHO** and **ACSM**.

Unlike traditional AI chatbots that rely only on pretrained knowledge, this application retrieves relevant scientific evidence before generating a response, ensuring that every recommendation is grounded in reliable sources and accompanied by citations.

---

# 🚀 Features

- 🔍 Retrieval-Augmented Generation (RAG)
- 📚 Scientific literature retrieval from PubMed
- 📄 Support for WHO & ACSM guideline documents
- 🤖 Claude-powered response generation
- 🧠 Semantic search using Sentence Transformers
- 💾 Persistent Chroma Vector Database
- ⚡ FastAPI REST API backend
- ⚛️ Modern React + Vite frontend
- 📖 Source citations with every response
- 💬 Interactive AI chat interface

---

# 📂 Project Structure

```text
fitness-rag-chatbot/
│
├── app/                         # FastAPI backend
│   ├── main.py
│   ├── retrieval.py
│   ├── generate.py
│   └── ...
│
├── ingestion/                   # Data ingestion pipeline
│   ├── fetch_pubmed.py
│   ├── load_guidelines.py
│   └── build_vectorstore.py
│
├── data/
│   ├── guidelines/
│   ├── processed/
│   └── raw/
│
├── frontend/                    # React + Vite frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── requirements.txt
├── .env.example
├── README.md
└── .gitignore
```

---

# 🛠 Tech Stack

## Frontend

- React
- Vite
- CSS
- Axios

## Backend

- FastAPI
- Python

## AI & RAG

- Anthropic Claude API
- Sentence Transformers (`all-MiniLM-L6-v2`)
- ChromaDB
- LangChain

## Data Sources

- PubMed
- WHO Guidelines
- ACSM Position Stands

---

# ⚙️ Installation

## Clone the repository

```bash
git clone https://github.com/naina-1212/fitness-rag-chatbot.git
cd fitness-rag-chatbot
```

---

## Create a virtual environment

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

## Install backend dependencies

```bash
pip install -r requirements.txt
```

---

## Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

---

## Configure environment variables

Create a `.env` file using `.env.example`

```env
ANTHROPIC_API_KEY=YOUR_API_KEY
```

---

# 📚 Building the Knowledge Base

### Step 1 — Fetch scientific abstracts

```bash
python ingestion/fetch_pubmed.py
```

Downloads curated PubMed abstracts related to fitness and nutrition.

---

### Step 2 — Load official guidelines

Place guideline PDFs inside

```
data/guidelines/
```

Examples:

- WHO Physical Activity Guidelines
- ACSM Position Stands

Then run

```bash
python ingestion/load_guidelines.py
```

---

### Step 3 — Build the Vector Database

```bash
python ingestion/build_vectorstore.py
```

This will:

- Chunk documents
- Generate embeddings
- Store vectors in ChromaDB

The vector database will be stored in

```
data/processed/chroma_db/
```

---

# ▶ Running the Backend

```bash
uvicorn app.main:app --reload --port 8000
```

Backend

```
http://localhost:8000
```

Swagger API Documentation

```
http://localhost:8000/docs
```

---

# ▶ Running the Frontend

```bash
cd frontend
npm run dev
```

Frontend

```
http://localhost:5173
```

---

# 🧪 Testing

## Retrieval

```bash
python app/retrieval.py "How much protein should I consume after a workout?"
```

---

## Full RAG Generation

```bash
python app/generate.py "How much protein should I consume after a workout?"
```

---

# 📌 Project Status

## ✅ Completed

- Project architecture
- PubMed abstract ingestion
- Guideline PDF ingestion
- Document chunking
- Embedding generation
- Chroma vector database
- Semantic retrieval pipeline
- Claude-powered answer generation
- FastAPI backend
- React frontend
- Modern chat interface
- Citation-grounded responses

---

## 🚧 Upcoming Features

- User authentication
- User profile management
- Personalized recommendations
- TDEE calculator
- Macro calculator
- Conversation memory
- Chat history
- Evaluation pipeline (Naive LLM vs RAG)
- Docker support
- Cloud deployment

---

# 💡 Why This Project?

Most AI fitness assistants rely entirely on the language model's pretrained knowledge, which can produce inaccurate or unsupported recommendations.

This project addresses that limitation by combining:

- Scientific evidence retrieval
- Official health guidelines
- Retrieval-Augmented Generation (RAG)
- Citation-grounded AI responses

The result is a transparent and trustworthy fitness assistant that generates recommendations supported by published research instead of relying solely on model memory.

---

# 🔮 Future Improvements

- Multi-turn conversational memory
- Personalized fitness coaching
- Wearable device integration
- Nutrition tracking
- Workout planning
- Voice assistant support
- Multi-language support
- Performance evaluation dashboard

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push the branch
5. Open a Pull Request

---

# 📄 License

This project is licensed under the MIT License.

---

# 👩‍💻 Author

**Naina Awan**

Computer Science Student • AI & Full Stack Developer

GitHub:
https://github.com/naina-1212
