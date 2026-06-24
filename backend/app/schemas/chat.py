from pydantic import BaseModel, Field, field_validator
from typing import Literal
import re
import uuid

class ChatRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="User question"
    )
    mode: Literal["WORKSPACE", "KNOWLEDGE_BASE"]
    document_ids: list[str] = Field(
        default_factory=list,
        max_length=100,
        description="List of document IDs to search"
    )
    history: list[dict] = Field(
        default_factory=list,
        max_length=50,
        description="Conversation history context"
    )

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        # Prevent SQL injection/dangerous patterns in the plain text question
        if re.search(r'(;|--|\/\*|\*\/|xp_|sp_)', v, re.IGNORECASE):
            raise ValueError("Invalid characters in question")
        return v.strip()

    @field_validator("document_ids")
    @classmethod
    def validate_document_ids(cls, v: list[str]) -> list[str]:
        # Validate that each document_id is a valid UUID format
        for doc_id in v:
            try:
                uuid.UUID(doc_id)
            except ValueError:
                raise ValueError(f"Invalid document ID format: {doc_id}")
        return v

    @field_validator("history")
    @classmethod
    def validate_history(cls, v: list[dict]) -> list[dict]:
        # Ensure conversation history items have role ("user", "assistant") and content with limited length
        for item in v:
            if not isinstance(item, dict):
                raise ValueError("History items must be dictionaries")
            if "role" not in item or "content" not in item:
                raise ValueError("History items must have both 'role' and 'content' keys")
            if item["role"] not in {"user", "assistant"}:
                raise ValueError("History role must be either 'user' or 'assistant'")
            if not isinstance(item["content"], str):
                raise ValueError("History content must be a string")
            if len(item["content"]) > 10000:
                raise ValueError("History content too long")
        return v
