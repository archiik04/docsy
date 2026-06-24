from fastapi import APIRouter, Depends, HTTPException, Request

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.chat import ChatRequest
from app.api.deps import get_current_user
from app.models.user import User

from app.services.chat_service import (
    generate_chat_response
)

router = APIRouter()


@router.post("/ask")
async def ask_question(
    request: Request,
    request_data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from app.core.audit import log_audit

    try:
        if request_data.mode not in {"WORKSPACE", "KNOWLEDGE_BASE"}:
            await log_audit(
                action="CHAT_ASK",
                resource="chat",
                status="FAILURE",
                user_id=str(current_user.id),
                ip_address=request.client.host if request.client else None,
                details={"error": "Invalid retrieval mode", "mode": request_data.mode},
                db=db
            )
            raise HTTPException(
                status_code=400,
                detail="Invalid retrieval mode"
            )

        answer, chunks, title = await generate_chat_response(
            question=request_data.question,
            document_ids=request_data.document_ids,
            mode=request_data.mode,
            user_id=str(current_user.id),
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

        await log_audit(
            action="CHAT_ASK",
            resource="chat",
            status="SUCCESS",
            user_id=str(current_user.id),
            ip_address=request.client.host if request.client else None,
            details={"mode": request_data.mode, "num_citations": len(citations), "title": title},
            db=db
        )

        return {
            "question": request_data.question,
            "answer": answer,
            "citations": citations,
            "title": title
        }

    except HTTPException as http_ex:
        await log_audit(
            action="CHAT_ASK",
            resource="chat",
            status="FAILURE",
            user_id=str(current_user.id),
            ip_address=request.client.host if request.client else None,
            details={"error": http_ex.detail},
            db=db
        )
        raise

    except Exception as e:
        print("\n===== CHAT ERROR =====\n")
        print(str(e))
        print("\n======================\n")

        await log_audit(
            action="CHAT_ASK",
            resource="chat",
            status="FAILURE",
            user_id=str(current_user.id),
            ip_address=request.client.host if request.client else None,
            details={"error": str(e)},
            db=db
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
