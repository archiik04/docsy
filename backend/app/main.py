from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
import logging
from contextlib import asynccontextmanager

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.documents import router as documents_router
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.routes.chat import router as chat_router
from app.services.embedding_service import get_embedding_model

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Pre-loading ML models at startup (lifespan)...")
    try:
        logger.info("Warming up embedding model...")
        emb_model = get_embedding_model()
        emb_model.encode(["warmup"])
        logger.info("✓ Embedding model warmed up.")
        logger.info("Docsy ready!")
    except Exception as e:
        logger.error(f"Error loading models at startup: {e}")
    yield

app = FastAPI(lifespan=lifespan)

os.makedirs("uploads", exist_ok=True)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPLOADS_DIR = os.path.join(
    BASE_DIR,
    "..",
    "uploads"
)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOADS_DIR),
    name="uploads"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)





app.include_router(
    auth_router,
    prefix="/api/v1/auth",
    tags=["Authentication"]
)

app.include_router(
    documents_router,
    prefix="/api/v1/documents",
    tags=["Documents"]
)

app.include_router(
    chat_router,
    prefix="/api/v1/chat",
    tags=["Chat"]
)

@app.get("/")
def root():
    return {"message": "DOCSY API RUNNING"}