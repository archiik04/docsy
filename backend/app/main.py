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
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.core.limiter import limiter
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Pre-loading ML models at startup (lifespan)...")
    try:
        # Auto-create audit logs table if not exists
        from app.core.database import AsyncSessionLocal
        from sqlalchemy import text
        async with AsyncSessionLocal() as db_session:
            await db_session.execute(text("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id UUID PRIMARY KEY,
                    user_id UUID,
                    action VARCHAR(255) NOT NULL,
                    resource VARCHAR(255) NOT NULL,
                    resource_id VARCHAR(255),
                    status VARCHAR(50) NOT NULL,
                    ip_address VARCHAR(50),
                    details JSONB,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
                )
            """))
            await db_session.commit()
        logger.info("✓ Database audit_logs table verified/created.")
    except Exception as db_err:
        logger.error(f"Error checking/creating audit_logs table: {db_err}")

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
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "DELETE", "PUT", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response





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