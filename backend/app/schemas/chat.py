from pydantic import BaseModel
from pydantic import Field
from typing import Literal

class ChatRequest(BaseModel):
    question: str
    mode: Literal["WORKSPACE", "KNOWLEDGE_BASE"]
    document_ids: list[str] = Field(default_factory=list)
    history: list[dict] = Field(default_factory=list)
