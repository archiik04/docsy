from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

from app.services.chat_service import (
    generate_chat_response
)


router = APIRouter()


@router.get("/ask")
async def ask_question(
    question: str,
    db: AsyncSession = Depends(get_db)
):

    answer = await generate_chat_response(
        question,
        db
    )

    return {
        "question": question,
        "answer": answer
    }