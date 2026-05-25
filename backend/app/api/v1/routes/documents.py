import uuid
import shutil
import fitz

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

router = APIRouter()


UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):

    # Generate unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"

    file_path = UPLOAD_DIR / unique_filename

    # Save uploaded file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Open PDF
    pdf_document = fitz.open(file_path)

    # Store full extracted text
    extracted_text = ""

    # Store all page-aware chunks
    all_chunks = []

    # Process page-by-page
    for page in pdf_document:

        page_text = clean_text(
            page.get_text()
        )

        # Skip empty pages
        if not page_text.strip():
            continue

        # Add to full document text
        extracted_text += page_text + "\n"

        # Chunk THIS page
        page_chunks = chunk_text(page_text)

        for chunk in page_chunks:

            all_chunks.append({
                "page_number": page.number + 1,
                "chunk_text": chunk
            })

    # Close PDF
    pdf_document.close()

    print(f"\nTOTAL CHUNKS: {len(all_chunks)}\n")

    if all_chunks:
        print("\n===== FIRST CHUNK =====\n")
        print(all_chunks[0]["chunk_text"][:500])
        print("\n=======================\n")

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

    # Save chunks + embeddings
    for index, chunk_data in enumerate(all_chunks):

        embedding = generate_embedding(
            chunk_data["chunk_text"]
        )

        new_chunk = DocumentChunk(
            document_id=new_document.id,
            chunk_index=index,
            chunk_text=chunk_data["chunk_text"],
            embedding=embedding,
            page_number=chunk_data["page_number"]
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

    # Verify ownership
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

    # Delete file from disk
    try:

        file_path = Path(doc.file_path)

        if file_path.exists():
            file_path.unlink()

    except Exception as e:
        print(f"Error deleting file: {e}")

    return {
        "message": "Document deleted successfully"
    }