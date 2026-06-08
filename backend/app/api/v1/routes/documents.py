import uuid
import shutil
import logging
from pathlib import Path
from typing import Optional
 
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
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
        
        # Generate embeddings in batch (more efficient than one-by-one)
        embeddings = generate_embeddings_batch(chunks)
        logger.info(f"[BG] Generated {len(embeddings)} embeddings")
        
        # Prepare chunk data
        all_chunks = [
            {
                "page_number": 1,
                "chunk_text": chunk,
                "section_title": "General",
                "embedding": embedding
            }
            for chunk, embedding in zip(chunks, embeddings)
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
    file: UploadFile = File(...),
    scope: DocumentScope = Form(DocumentScope.PERSONAL),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """
    Upload document endpoint - Returns immediately.
    
    Process flow:
    1. Validate file
    2. Save file to disk
    3. Create document record with status="processing"
    4. Queue background task
    5. Return immediately to user
    
    Response time: ~100-500ms (not 30-60s)
    
    Background task handles:
    - OCR/text extraction
    - Embedding generation
    - Database indexing
    """
    
    if scope == DocumentScope.KNOWLEDGE_BASE and current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    
    file_extension = Path(file.filename).suffix.lower()
    
    if file_extension not in ALLOWED_EXTENSIONS:
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
        raise HTTPException(status_code=500, detail=f"File save failed: {e}")
    
    # Create document record with "processing" status
    document_id = uuid.uuid4()
    new_document = Document(
        id=document_id,
        filename=unique_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        content_type=file.content_type,
        file_size=file.size,
        processing_status="processing",  # Key: not "completed" yet
        scope=scope,
        extracted_text="",  # Will be filled by background task
        owner_id=current_user.id,
    )
    
    db.add(new_document)
    await db.commit()
    logger.info(f"Document record created: {document_id}")
    
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
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete document and chunks."""
    
    query = select(Document).where(
        Document.id == document_id,
        Document.owner_id == current_user.id
    )
    
    result = await db.execute(query)
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
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


