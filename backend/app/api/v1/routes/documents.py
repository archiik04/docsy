import uuid
import shutil
import logging
from pathlib import Path
from typing import Optional
 
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
 
from app.api.deps import get_current_user
from app.core.database import get_db, AsyncSessionLocal
 
from app.models.user import User
from app.models.document import Document, DocumentScope
from app.models.document_chunk import DocumentChunk
 
from app.services.text_chunker import chunk_text
from app.services.embedding_service import generate_embeddings_batch
from app.services.text_cleaner import clean_text
from sqlalchemy.dialects.postgresql import JSONB
 
from app.services.document_extractors import (
    extract_pdf_text,
    extract_txt_text,
    extract_docx_text,
    extract_image_text
)
 
logger = logging.getLogger(__name__)
router = APIRouter()
 
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
 
ALLOWED_EXTENSIONS = {
    ".pdf",
    ".txt",
    ".docx",
    ".png",
    ".jpg",
    ".jpeg"
}
 
 
async def generate_document_summary(text: str) -> str:
    from app.services.chat_service import client, groq_active
    # Use up to 8000 characters for summary
    preview = text[:8000]
    try:
        response = await client.chat.completions.create(
            model="openai/gpt-oss-20b" if groq_active else "meta-llama/llama-3.1-8b-instruct",
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant. Write a concise, 2-3 paragraph summary of the following document content, detailing its main topic, key concepts, and structured sections."
                },
                {
                    "role": "user",
                    "content": f"Document content:\n{preview}"
                }
            ]
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error generating document summary: {e}")
        return f"This document contains the following text: {preview[:300]}..."


async def process_document_background(
    document_id: uuid.UUID,
    file_path: Path,
    file_extension: str,
    db: Optional[AsyncSession] = None,
):
    if db is None:
        async with AsyncSessionLocal() as session:
            return await process_document_background(document_id, file_path, file_extension, session)
    """
    Background task: Process document after upload.
    
    Steps:
    1. Extract text (OCR if image)
    2. Clean text
    3. Chunk text
    4. Generate embeddings
    5. Save chunks to DB
    6. Update document status
    
    This runs **after** user receives response.
    """
    
    try:
        logger.info(f"[BG] Starting document processing: {document_id}")
        
        # Extract text based on file type
        if file_extension == ".pdf":
            extracted_text = extract_pdf_text(file_path)
        elif file_extension == ".txt":
            extracted_text = extract_txt_text(file_path)
        elif file_extension == ".docx":
            extracted_text = extract_docx_text(file_path)
        elif file_extension in {".png", ".jpg", ".jpeg"}:
            extracted_text = extract_image_text(file_path)
        else:
            raise ValueError(f"Unsupported extension: {file_extension}")
        
        logger.info(f"[BG] Extracted {len(extracted_text)} chars")
        
        # Clean text
        extracted_text = clean_text(extracted_text)
        logger.info(f"[BG] Cleaned text: {len(extracted_text)} chars")
        
        # Chunk text
        chunks = chunk_text(extracted_text)
        logger.info(f"[BG] Created {len(chunks)} chunks")
        
        # Generate document summary chunk
        summary_text = await generate_document_summary(extracted_text)
        summary_chunk = f"SUMMARY OF THE DOCUMENT:\n{summary_text}"
        
        # Prepend summary chunk to chunks
        chunks.insert(0, summary_chunk)
        
        # Generate embeddings in batch (more efficient than one-by-one)
        embeddings = generate_embeddings_batch(chunks)
        logger.info(f"[BG] Generated {len(embeddings)} embeddings")
        
        # Prepare chunk data
        all_chunks = [
            {
                "page_number": 1,
                "chunk_text": chunk,
                "section_title": "Summary" if idx == 0 else "General",
                "embedding": embedding
            }
            for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]
        
        # Save chunks to DB
        for index, chunk_data in enumerate(all_chunks):
            new_chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=index,
                chunk_text=chunk_data["chunk_text"],
                embedding=chunk_data["embedding"],
                page_number=chunk_data["page_number"],
                section_title=chunk_data["section_title"]
            )
            db.add(new_chunk)
        
        await db.commit()
        logger.info(f"[BG] Saved {len(all_chunks)} chunks to DB")
        
        # Update document status to "completed"
        await db.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(
                processing_status="completed",
                extracted_text=extracted_text
            )
        )
        await db.commit()
        
        logger.info(f"[BG] Document processing complete: {document_id}")
        
    except Exception as e:
        logger.error(f"[BG] Error processing document {document_id}: {e}")
        
        # Update status to "failed"
        try:
            await db.execute(
                update(Document)
                .where(Document.id == document_id)
                .values(processing_status="failed")
            )
            await db.commit()
        except Exception as db_error:
            logger.error(f"[BG] Failed to update document status: {db_error}")
 
 
@router.post("/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    scope: DocumentScope = Form(DocumentScope.PERSONAL),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """
    Upload document endpoint - Returns immediately.
    
    Process flow:
    1. Validate file size and type
    2. Save file to disk
    3. Create document record with status="processing"
    4. Queue background task
    5. Return immediately to user
    """
    # Enforce file size limit (limit: 100MB)
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_FILE_SIZE:
        from app.core.audit import log_audit
        await log_audit(
            action="UPLOAD_DOCUMENT",
            resource="document",
            status="FAILURE",
            user_id=str(current_user.id),
            ip_address=request.client.host if request.client else None,
            details={"error": "File size exceeds content-length limit of 100MB", "filename": file.filename},
            db=db
        )
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max: {MAX_FILE_SIZE / (1024 * 1024)}MB"
        )

    # Validate file size dynamically in chunks
    file_size = 0
    chunk_size = 1024 * 1024  # 1MB
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        file_size += len(chunk)
        if file_size > MAX_FILE_SIZE:
            from app.core.audit import log_audit
            await log_audit(
                action="UPLOAD_DOCUMENT",
                resource="document",
                status="FAILURE",
                user_id=str(current_user.id),
                ip_address=request.client.host if request.client else None,
                details={"error": "File size exceeds streaming limit of 100MB", "filename": file.filename},
                db=db
            )
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Max: {MAX_FILE_SIZE / (1024 * 1024)}MB"
            )
    await file.seek(0)

    from app.core.audit import log_audit
    
    if scope == DocumentScope.KNOWLEDGE_BASE and current_user.role != "admin":
        await log_audit(
            action="UPLOAD_DOCUMENT",
            resource="document",
            status="FAILURE",
            user_id=str(current_user.id),
            ip_address=request.client.host if request.client else None,
            details={"error": "Admin access required", "filename": file.filename},
            db=db
        )
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    
    file_extension = Path(file.filename).suffix.lower()
    
    if file_extension not in ALLOWED_EXTENSIONS:
        await log_audit(
            action="UPLOAD_DOCUMENT",
            resource="document",
            status="FAILURE",
            user_id=str(current_user.id),
            ip_address=request.client.host if request.client else None,
            details={"error": "Unsupported file type", "filename": file.filename},
            db=db
        )
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save uploaded file to disk
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"File saved: {unique_filename}")
    except Exception as e:
        await log_audit(
            action="UPLOAD_DOCUMENT",
            resource="document",
            status="FAILURE",
            user_id=str(current_user.id),
            ip_address=request.client.host if request.client else None,
            details={"error": f"File save failed: {e}", "filename": file.filename},
            db=db
        )
        raise HTTPException(status_code=500, detail=f"File save failed: {e}")
    
    # Create document record with "processing" status
    document_id = uuid.uuid4()
    new_document = Document(
        id=document_id,
        filename=unique_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        content_type=file.content_type,
        file_size=file_size,
        processing_status="processing",  # Key: not "completed" yet
        scope=scope,
        extracted_text="",  # Will be filled by background task
        owner_id=current_user.id,
    )
    
    try:
        db.add(new_document)
        await db.commit()
        logger.info(f"Document record created: {document_id}")
        
        # Log successful upload in audit logs
        await log_audit(
            action="UPLOAD_DOCUMENT",
            resource="document",
            resource_id=str(document_id),
            status="SUCCESS",
            user_id=str(current_user.id),
            ip_address=request.client.host if request.client else None,
            details={"filename": file.filename, "size": file_size, "scope": str(scope)},
            db=db
        )
    except Exception as db_err:
        logger.error(f"Error saving document record: {db_err}")
        # Clean up file on disk
        if file_path.exists():
            file_path.unlink()
        await log_audit(
            action="UPLOAD_DOCUMENT",
            resource="document",
            status="FAILURE",
            user_id=str(current_user.id),
            ip_address=request.client.host if request.client else None,
            details={"error": f"DB record save failed: {db_err}", "filename": file.filename},
            db=db
        )
        raise HTTPException(status_code=500, detail="Failed to save document info to database.")
    
    # Queue background processing
    background_tasks.add_task(
        process_document_background,
        document_id,
        file_path,
        file_extension
    )
    logger.info(f"Background task queued for: {document_id}")
    
    # Return IMMEDIATELY (don't wait for background task)
    return {
        "document_id": str(new_document.id),
        "filename": new_document.filename,
        "original_filename": new_document.original_filename,
        "scope": new_document.scope,
        "uploaded_by": current_user.email,
        "status": "processing",  # Tell frontend: "Processing..."
        "message": "Document uploaded. Processing in background..."
    }
 
 
@router.get("")
async def list_documents(
    scope: Optional[DocumentScope] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List documents with processing status.
    
    Status values:
    - "processing": OCR/embedding in progress
    - "completed": Ready to query
    - "failed": Error occurred
    """
    if scope is None:
        scope = DocumentScope.PERSONAL
        
    if scope == DocumentScope.KNOWLEDGE_BASE:
        query = (
            select(Document)
            .where(Document.scope == DocumentScope.KNOWLEDGE_BASE)
            .order_by(Document.created_at.desc())
        )
    else:
        query = (
            select(Document)
            .where(
                Document.owner_id == current_user.id,
                Document.scope == DocumentScope.PERSONAL
            )
            .order_by(Document.created_at.desc())
        )
    
    result = await db.execute(query)
    documents = result.scalars().all()
    
    return [
        {
            "id": str(doc.id),
            "filename": doc.filename,
            "original_filename": doc.original_filename,
            "file_size": doc.file_size,
            "scope": doc.scope,
            "created_at": doc.created_at.isoformat(),
            "processing_status": doc.processing_status,  # "processing" | "completed" | "failed"
            "extracted_text": doc.extracted_text,
        }
        for doc in documents
    ]
 
 
@router.get("/{document_id}")
async def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single document with status."""
    
    query = select(Document).where(
        Document.id == document_id,
        Document.owner_id == current_user.id
    )
    
    result = await db.execute(query)
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "id": str(doc.id),
        "filename": doc.filename,
        "original_filename": doc.original_filename,
        "file_size": doc.file_size,
        "scope": doc.scope,
        "created_at": doc.created_at.isoformat(),
        "processing_status": doc.processing_status,
        "extracted_text": doc.extracted_text,
    }
 
 
@router.delete("/{document_id}")
async def delete_document(
    request: Request,
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete document and chunks."""
    from app.core.audit import log_audit
    
    query = select(Document).where(
        Document.id == document_id,
        Document.owner_id == current_user.id
    )
    
    result = await db.execute(query)
    doc = result.scalar_one_or_none()
    
    if not doc:
        await log_audit(
            action="DELETE_DOCUMENT",
            resource="document",
            resource_id=str(document_id),
            status="FAILURE",
            user_id=str(current_user.id),
            ip_address=request.client.host if request.client else None,
            details={"error": "Document not found or access denied"},
            db=db
        )
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        # Delete chunks
        chunk_delete_query = delete(DocumentChunk).where(
            DocumentChunk.document_id == document_id
        )
        await db.execute(chunk_delete_query)
        
        # Delete document
        document_delete_query = delete(Document).where(
            Document.id == document_id
        )
        await db.execute(document_delete_query)
        await db.commit()
        
        # Delete file
        try:
            file_path = Path(doc.file_path)
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            logger.warning(f"Error deleting file: {e}")
            
        await log_audit(
            action="DELETE_DOCUMENT",
            resource="document",
            resource_id=str(document_id),
            status="SUCCESS",
            user_id=str(current_user.id),
            ip_address=request.client.host if request.client else None,
            details={"filename": doc.original_filename},
            db=db
        )
    except Exception as e:
        await log_audit(
            action="DELETE_DOCUMENT",
            resource="document",
            resource_id=str(document_id),
            status="FAILURE",
            user_id=str(current_user.id),
            ip_address=request.client.host if request.client else None,
            details={"error": str(e)},
            db=db
        )
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {e}")
    
    return {"message": "Document deleted successfully"}

@router.post("/{document_id}/mindmap")
async def generate_mindmap(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Document).where(
        Document.id == document_id,
        Document.owner_id == current_user.id
    )
    result = await db.execute(query)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc.mindmap_data:
        return doc.mindmap_data
    
    from app.services.mindmap_service import generate_mindmap as svc_generate_mindmap
    try:
        mindmap = await svc_generate_mindmap(str(document_id), db)
        return mindmap
    except Exception as e:
        logger.error(f"Error generating mindmap: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{document_id}/mindmap")
async def delete_mindmap(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Document).where(
        Document.id == document_id,
        Document.owner_id == current_user.id
    )
    result = await db.execute(query)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.mindmap_data = None
    db.add(doc)
    await db.commit()
    return {"message": "Mind map cache cleared"}

@router.get("/{document_id}/whiteboard")
async def get_whiteboard(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return { "canvas_data": doc.whiteboard_data }


@router.post("/{document_id}/whiteboard")
async def save_whiteboard(
    document_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == current_user.id
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.whiteboard_data = payload.get("canvas_data")
    db.add(doc)
    await db.commit()
    return { "message": "Saved" }


