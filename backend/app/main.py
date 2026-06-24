from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging
import os

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.chat import router as chat_router
from app.api.v1.routes.documents import router as documents_router
from app.core.config import settings
from app.core.limiter import limiter
from app.services.embedding_service import get_embedding_model
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
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


async def rate_limit_exceeded_handler(
    _request: Request,
    exc: Exception,
) -> Response:
    detail = exc.detail if isinstance(exc, RateLimitExceeded) else str(exc)
    return JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded: {detail}"},
    )


app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

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
async def add_security_headers(
    request: Request,
    call_next: RequestResponseEndpoint,
) -> Response:
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Allow Hugging Face to iframe the API for its preview/interface
    response.headers["Content-Security-Policy"] = (
        "frame-ancestors 'self' https://*.huggingface.co "
        "https://huggingface.co http://localhost:5173 http://localhost:3000"
    )
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
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
def root() -> dict[str, str]:
    return {"message": "DOCSY API RUNNING"}
