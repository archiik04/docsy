from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    question: str
    document_ids: list[str]
    history: list[dict] = []
