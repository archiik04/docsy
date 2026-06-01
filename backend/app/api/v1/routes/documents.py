import uuid
import shutil

from pathlib import Path

from fastapi import APIRouter
from fastapi import UploadFile
from fastapi import File
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.api.deps import get_current_user
from app.core.database import get_db

from app.models.user import User
from app.models.document import Document
from app.models.document_chunk import DocumentChunk

from app.services.text_chunker import chunk_text
from app.services.embedding_service import generate_embedding
from app.services.text_cleaner import clean_text

from app.api.deps import require_admin

from app.services.document_extractors import (
    extract_pdf_text,
    extract_txt_text,
    extract_docx_text,
    extract_image_text
)

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):

    ALLOWED_EXTENSIONS = {
        ".pdf",
        ".txt",
        ".docx",
        ".png",
        ".jpg",
        ".jpeg"
    }

    file_extension = Path(
        file.filename
    ).suffix.lower()

    if file_extension not in ALLOWED_EXTENSIONS:

        raise HTTPException(
            status_code=400,
            detail="Unsupported file type"
        )

    unique_filename = (
        f"{uuid.uuid4()}{file_extension}"
    )

    file_path = UPLOAD_DIR / unique_filename

    # Save uploaded file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )

    # Extract text based on file type
    if file_extension == ".pdf":
        extracted_text = extract_pdf_text(
        file_path
        )
        
    elif file_extension == ".txt":
        extracted_text = extract_txt_text(
        file_path
        )
    
    elif file_extension == ".docx":
        extracted_text = extract_docx_text(
        file_path
        )
    
    elif file_extension in {
    ".png",
    ".jpg",
    ".jpeg"
    }:
        extracted_text = extract_image_text(
        file_path
        )
        
    else:
        raise HTTPException(
        status_code=400,
        detail="Unsupported file type"
    )

    extracted_text = clean_text(
        extracted_text
    )

    chunks = chunk_text(
        extracted_text
    )

    all_chunks = []

    for chunk in chunks:

        embedding = generate_embedding(
            chunk
        )

        all_chunks.append({
            "page_number": 1,
            "chunk_text": chunk,
            "section_title": "General",
            "embedding": embedding
        })

    print(
        f"\nTOTAL CHUNKS: {len(all_chunks)}\n"
    )

    # Save document metadata
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

    # Save chunks
    for index, chunk_data in enumerate(
        all_chunks
    ):

        new_chunk = DocumentChunk(
            document_id=new_document.id,
            chunk_index=index,
            chunk_text=chunk_data["chunk_text"],
            embedding=chunk_data["embedding"],
            page_number=chunk_data["page_number"],
            section_title=chunk_data["section_title"]
        )

        db.add(new_chunk)

    await db.commit()

    return {
        "document_id": str(new_document.id),
        "filename": new_document.filename,
        "original_filename": new_document.original_filename,
        "uploaded_by": current_user.email,
        "total_chunks": len(all_chunks)
    }


@router.get("")
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

    query = (
        select(Document)
        .where(Document.owner_id == current_user.id)
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

    query = select(Document).where(
        Document.id == document_id,
        Document.owner_id == current_user.id
    )

    result = await db.execute(query)

    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    chunk_delete_query = delete(DocumentChunk).where(
        DocumentChunk.document_id == document_id
    )

    await db.execute(chunk_delete_query)

    document_delete_query = delete(Document).where(
        Document.id == document_id
    )

    await db.execute(document_delete_query)

    await db.commit()

    try:

        file_path = Path(doc.file_path)

        if file_path.exists():
            file_path.unlink()

    except Exception as e:
        print(f"Error deleting file: {e}")

    return {
        "message": "Document deleted successfully"
    }
