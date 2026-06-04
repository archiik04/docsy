# Docsy - Advanced RAG & OCR Document Workspace

Docsy is a high-performance, layout-aware Retrieval-Augmented Generation (RAG) platform. It allows users to upload documents (PDF, DOCX, TXT) and images (PNG, JPG, JPEG), extract their contents locally using **Tesseract OCR**, generate dense vector representations, and run grounded, context-aware semantic search and chatbot queries.


## Table of Contents
1. [System Architecture](#system-architecture)
2. [Project Technology Stack](#project-technology-stack)
3. [Directory Layout](#directory-layout)
4. [Ingestion & OCR Pipeline](#ingestion--ocr-pipeline)
5. [Retrieval & Query Pipeline](#retrieval--query-pipeline)
6. [Database Schema](#database-schema)
7. [Installation & Setup](#installation--setup)
8. [API Reference](#api-reference)


## System Architecture

Docsy uses a dual-pipeline design for ingesting documents and answering user queries.

### 1. Ingestion & Indexing Pipeline
```mermaid
graph TD
    A[File Uploaded] --> B{File Extension?}
    B -->|TXT| C[Direct Read]
    B -->|DOCX| D[python-docx Parser]
    B -->|PDF| E{Has Selectable Text?}
    B -->|Image| F[Tesseract OCR]
    E -->|Yes| G[Extract PDF Text]
    E -->|No| H[Render Pages to PNG -> Tesseract OCR]
    C & D & G & H & F --> I[Text Cleaning]
    I --> J[Recursive Text Chunking]
    J --> K[Generate Embeddings via MiniLM-L6]
    K --> L[(PostgreSQL + pgvector)]
```

### 2. Retrieval & Query Pipeline
```mermaid
graph TD
    A[User Question] --> B[Generate Text Embeddings]
    B --> C[Hybrid Retrieval: Vector Distance + FTS Keyword Rank]
    C --> D[Top Candidate Chunks]
    D --> E[Rerank via Cross-Encoder ms-marco-MiniLM]
    E --> F{Rerank Score > -15.0?}
    F -->|No| G[Return 'No relevant info found']
    F -->|Yes| H[Construct Grounded System Prompt]
    H --> I[LLM: meta-llama-3-8b-instruct]
    I --> J[Context-Grounded Answer]
```

## Project Technology Stack

### Backend
* **Web Framework**: FastAPI (Asynchronous endpoints, native BackgroundTasks)
* **ORM & Database Connection**: SQLAlchemy + asyncpg
* **OCR Engine**: pytesseract (Local Tesseract OCR integration)
* **PDF Processing**: PyMuPDF (`fitz`) for native text extraction and high-DPI page rendering
* **Word Processing**: `python-docx`
* **Embeddings**: SentenceTransformers (`sentence-transformers/all-MiniLM-L6-v2`, 384 dimensions)
* **Reranker**: HuggingFace Cross-Encoder (`cross-encoder/ms-marco-MiniLM-L-6-v2`)
* **LLM Orchestration**: OpenRouter API (`meta-llama/llama-3-8b-instruct`)

### Frontend
* **Build Tool**: Vite + React
* **Styling & Icons**: Lucide React, Framer Motion
* **State Management**: Zustand
* **Router**: React Router DOM

### Database
* **Engine**: PostgreSQL 16
* **Vector Extensions**: `pgvector` for Cosine similarity vector search
* **Indices**: GIN indexes for Full-Text Search (`fts`), HNSW indices for high-dimensional vector search


## Directory Layout

```
docsy/
├── backend/
│   ├── alembic/                    # Database migration versioning scripts
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py             # Route dependencies (e.g. auth check)
│   │   │   └── v1/
│   │   │       └── routes/
│   │   │           ├── auth.py     # Authentication, Login, Register
│   │   │           ├── chat.py     # Grounded Q&A Chat operations
│   │   │           └── documents.py# Document Upload, Ingestion, Deletion
│   │   ├── core/
│   │   │   ├── config.py           # Configuration Settings validation (Pydantic)
│   │   │   ├── database.py         # DB connection pool initialization
│   │   │   └── security.py         # JWT Token signing and hashing
│   │   ├── models/
│   │   │   ├── document.py         # Document Metadata Table model
│   │   │   ├── document_chunk.py   # Text Chunk & Vector Table model
│   │   │   └── user.py             # User Identity Table model
│   │   ├── schemas/
│   │   │   ├── auth.py             # User authentication Pydantic models
│   │   │   └── chat.py             # Chat ask request/response Pydantic models
│   │   └── services/
│   │       ├── chat_service.py     # Context building & Chat generation
│   │       ├── document_extractors.py# Format handlers (.pdf, .docx, .txt)
│   │       ├── embedding_service.py# Embedding generator (MiniLM-L6)
│   │       ├── ocr_service.py      # Tesseract OCR local pipeline
│   │       ├── reranker_service.py # Cross-Encoder reranking operations
│   │       ├── retrieval_service.py# Hybrid pgvector retrieval matching
│   │       ├── text_chunker.py     # Recursive layout-aware chunking
│   │       └── text_cleaner.py     # Text cleaning & standardization
│   ├── requirements.txt            # Python dependencies (local environment)
│   └── test_ocr.py                 # Self-contained local OCR tester
├── frontend/
│   ├── src/
│   │   ├── components/             # Reusable UI component modules
│   │   ├── pages/
│   │   │   ├── auth/               # Sign In / Register UI
│   │   │   ├── workspace/          # Main doc workspace, viewers, chat panel
│   │   │   └── settings/           # User configuration pages
│   │   ├── stores/
│   │   │   └── workspaceStore.js   # Zustand global state (polling, uploads)
│   │   ├── App.jsx                 # Layout entry & routing
│   │   └── main.jsx                # DOM mounting
│   ├── package.json                # NPM configuration & packages
│   └── vite.config.js              # Vite bundler parameters
├── docker-compose.yml              # Local PostgreSQL + pgvector service launcher
└── README.md                       # Project system architecture guide
```


## Ingestion & OCR Pipeline

The ingestion pipeline is designed to parse documents asynchronously so that the user receives an immediate response upon uploading a file.

1. **Upload Endpoint (`/upload`)**: Saves the raw uploaded file into `backend/uploads/` and commits a document record in PostgreSQL with status `"processing"`.
2. **Background Task Queue**: Dispatches a worker task to run the text extraction.
3. **Local Text Extraction**:
   * **Plain Text (`.txt`)**: Read directly as UTF-8.
   * **Word Documents (`.docx`)**: Text is extracted paragraph-by-paragraph.
   * **Images (`.png`, `.jpg`, `.jpeg`)**: Preprocessed into grayscale (`PIL.Image.convert('L')`) and parsed via local Tesseract OCR.
   * **PDF Documents (`.pdf`)**: First attempts native text extraction using PyMuPDF. If no text is detected (scanned PDF), pages are dynamically rendered as 150-DPI PNG pixmaps, converted to grayscale, and OCR'd page-by-page.
4. **Chunking & Embeddings**: The text is cleaned and recursively chunked. Chunks are converted into 384-dimensional dense vectors using the HuggingFace embedding engine and loaded into the database.
5. **Status Update**: The database record status changes to `"completed"` or `"failed"`.

---

## Retrieval & Query Pipeline

When a user submits a query to chat, Docsy follows these steps to retrieve grounded, relevant answers:

1. **Candidate Retrieval (Hybrid Search)**:
   * **Semantic Search**: Generates query embeddings and queries PostgreSQL using Cosine distance operator (`<=>`).
   * **Keyword Search**: Uses PostgreSQL Full-Text Search GIN index `ts_rank` to score keyword matches.
   * Combined score is calculated to yield up to 400 candidate chunks.
2. **Cross-Encoder Reranking**:
   * Chunks are scored via Cross-Encoder relevance matching (`cross-encoder/ms-marco-MiniLM-L-6-v2`).
   * Results with a reranking logit score lower than **`-15.0`** are filtered out.
3. **Context Construction & Grounded Chat**:
   * The top 4 ranked chunks are injected into a strict system prompt.
   * The LLM receives instructions to only answer based on the provided context, paying attention to semi-structured formats (e.g. key-value pairs like `Name: Cutie`).


## Database Schema

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    role VARCHAR DEFAULT 'user',
    full_name VARCHAR,
    hashed_password VARCHAR NOT NULL
);

-- Documents Table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR NOT NULL,
    original_filename VARCHAR NOT NULL,
    file_path VARCHAR NOT NULL,
    content_type VARCHAR NOT NULL,
    file_size INTEGER NOT NULL,
    processing_status VARCHAR DEFAULT 'uploaded',
    scope VARCHAR DEFAULT 'PERSONAL',
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT timezone('utc', now()),
    extracted_text VARCHAR
);

-- Document Chunks Table (with Vector Support)
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text VARCHAR NOT NULL,
    embedding VECTOR(384) NOT NULL, -- pgvector 384 dimensions
    fts TSVECTOR,                   -- Full Text Search index column
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT timezone('utc', now()),
    page_number INTEGER NOT NULL,
    section_title VARCHAR NOT NULL
);
```


## Installation & Setup

### 1. Tesseract OCR System Installation
Tesseract is a local system package that must be installed on your machine.

#### Windows
Install via PowerShell (Admin):
```powershell
winget install UB-Mannheim.TesseractOCR --accept-package-agreements --accept-source-agreements
```
Or download manually from the [UB-Mannheim wiki](https://github.com/UB-Mannheim/tesseract/wiki) and add `C:\Program Files\Tesseract-OCR` to your System PATH variables. Alternatively, you can configure it directly inside your `.env` file:
```env
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```

#### macOS
```bash
brew install tesseract
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr libtesseract-dev
```

### 2. Backend Installation
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start database services from the root of the project:
   ```bash
   docker-compose up -d
   ```
5. Configure `.env`:
   ```env
   DATABASE_URL=postgresql+asyncpg://docsy_user:docsy123@127.0.0.1:5432/docsy_db
   OPENROUTER_API_KEY=your_openrouter_api_key
   SECRET_KEY=your_jwt_signing_secret
   TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
   ```
6. Run migrations:
   ```bash
   alembic upgrade head
   ```
7. Run the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --reload
   ```

### 3. Frontend Installation
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm modules:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```


## API Reference

### Auth
* **POST `/api/v1/auth/register`**: Registers a new user.
* **POST `/api/v1/auth/login`**: Authenticates user and returns JWT Bearer token.

### Documents
* **POST `/api/v1/documents/upload`**: Ingests new PDF, DOCX, TXT, or Image. Starts asynchronous background parsing task.
* **GET `/api/v1/documents`**: Lists all uploaded documents and their processing status (`"processing"`, `"completed"`, `"failed"`).
* **GET `/api/v1/documents/{document_id}`**: Retrieves document metadata.
* **DELETE `/api/v1/documents/{document_id}`**: Deletes the document file and its vector chunk database listings.

### Chat
* **POST `/api/v1/chat/ask`**: Submits a query. Automatically performs vector semantic query matching, reranking, and responds with grounding sources.
