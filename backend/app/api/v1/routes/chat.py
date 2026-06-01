from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

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

    try:

        answer, chunks, title = await generate_chat_response(
            question=request_data.question,
            document_ids=request_data.document_ids,
            history=request_data.history,
            db=db
        )

        citations = []

        for chunk in chunks:

            citations.append({
                "chunk_text": chunk.get("chunk_text"),
                "page_number": chunk.get("page_number"),
                "section_title": chunk.get("section_title"),
                "filename": chunk.get("filename"),
                "original_filename": chunk.get("original_filename"),
                "distance": float(chunk["distance"]) if chunk.get("distance") is not None else None,
                "keyword_rank": float(chunk["keyword_rank"]) if chunk.get("keyword_rank") is not None else None,
                "rerank_score": float(chunk["rerank_score"]) if chunk.get("rerank_score") is not None else None
            })

        return {
            "question": request_data.question,
            "answer": answer,
            "citations": citations,
            "title": title
        }

    except Exception as e:

        print("\n===== CHAT ERROR =====\n")
        print(str(e))
        print("\n======================\n")

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )