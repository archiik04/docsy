import uuid
import shutil
import fitz

from pathlib import Path

from fastapi import APIRouter
from fastapi import UploadFile
from fastapi import File
from fastapi import Depends

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.api.deps import get_current_user
from app.services.embedding_service import generate_embedding
from app.core.database import get_db
from app.models.document_chunk import DocumentChunk
from app.models.user import User
from app.models.document import Document
from app.services.text_chunker import chunk_text
from app.models.document_chunk import DocumentChunk
from app.services.embedding_service import generate_embedding


router = APIRouter()


UPLOAD_DIR = Path("uploads")

UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

    file_extension = Path(file.filename).suffix

    unique_filename = f"{uuid.uuid4()}{file_extension}"

    file_path = UPLOAD_DIR / unique_filename

    # SAVE FILE TO DISK
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # OPEN PDF
    pdf_document = fitz.open(file_path)

    # STORE ALL TEXT
    extracted_text = ""

    # LOOP THROUGH PAGES
    for page in pdf_document:
        extracted_text += page.get_text()

    # CLOSE PDF
    pdf_document.close()

    # CHUNK THE EXTRACTED TEXT
    chunks = chunk_text(extracted_text)
    print(f"TOTAL CHUNKS: {len(chunks)}")
    if chunks:
        print(f"FIRST CHUNK: {chunks[0]}")

    # SAVE DOCUMENT METADATA TO POSTGRESQL
    new_document = Document(
        filename=unique_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        content_type=file.content_type,
        file_size=file.size,
        processing_status="uploaded",
        extracted_text=extracted_text,
        owner_id=current_user.id,
    )

    db.add(new_document)

    await db.commit()

    await db.refresh(new_document)

    for index, chunk in enumerate(chunks):

        embedding = generate_embedding(chunk)

        new_chunk = DocumentChunk(
            document_id=new_document.id,
            chunk_index=index,
            chunk_text=chunk,
            embedding=embedding
        )

        db.add(new_chunk)

    await db.commit()

    return {
        "document_id": str(new_document.id),
        "filename": new_document.filename,
        "original_filename": new_document.original_filename,
        "uploaded_by": current_user.email,
    }


@router.get("")
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Document).where(Document.owner_id == current_user.id).order_by(Document.created_at.desc())
    result = await db.execute(query)
    documents = result.scalars().all()
    return [
        {
            "id": str(doc.id),
            "filename": doc.filename,
            "original_filename": doc.original_filename,
            "file_size": doc.file_size,
            "created_at": doc.created_at.isoformat(),
            "processing_status": doc.processing_status,
            "extracted_text": doc.extracted_text,
        }
        for doc in documents
    ]


@router.delete("/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify owner
    query = select(Document).where(Document.id == document_id, Document.owner_id == current_user.id)
    result = await db.execute(query)
    doc = result.scalar_one_or_none()
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete chunks
    chunk_del_query = delete(DocumentChunk).where(DocumentChunk.document_id == document_id)
    await db.execute(chunk_del_query)
    
    # Delete doc
    doc_del_query = delete(Document).where(Document.id == document_id)
    await db.execute(doc_del_query)
    
    await db.commit()
    
    # Delete file from disk if exists
    try:
        file_path = Path(doc.file_path)
        if file_path.exists():
            file_path.unlink()
    except Exception as e:
        print(f"Error deleting file: {e}")
        
    return {"message": "Document deleted successfully"}