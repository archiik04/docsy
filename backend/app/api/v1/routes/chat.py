from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.chat import ChatRequest
from app.services.chat_service import (
    generate_chat_response
)


router = APIRouter()


@router.post("/ask")
async def ask_question(
    request_data: ChatRequest,
    db: AsyncSession = Depends(get_db)
):

    answer, chunks = await generate_chat_response(
        question=request_data.question,
        document_id=request_data.document_id,
        db=db
    )

    return {
        "question": request_data.question,
        "answer": answer,
        "citations": [
            {
                "chunk_text": chunk[0],
                "filename": chunk[1],
                "distance": float(chunk[2]) if chunk[2] is not None else 0.0
            }
            for chunk in chunks
        ]
    }