from fastapi import FastAPI

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.documents import router as documents_router
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.routes.chat import router as chat_router



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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