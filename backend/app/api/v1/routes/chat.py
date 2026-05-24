from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

from app.services.retrieval_service import (
    retrieve_similar_chunks
)


router = APIRouter()


@router.get("/ask")
async def ask_question(
    question: str,
    db: AsyncSession = Depends(get_db)
):

    results = await retrieve_similar_chunks(
        question,
        db
    )

    return {
        "question": question,
        "matches": [
            row[0] for row in results
        ]
    }