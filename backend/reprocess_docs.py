import asyncio
import logging
import sys
from pathlib import Path
from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal
from app.models.document import Document
from app.api.v1.routes.documents import process_document_background

# Ensure stdout/stderr use UTF-8 on Windows to avoid UnicodeEncodeError in terminal
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("reprocess_docs")

# Disable SQLAlchemy engine echoing logs to avoid stdout CP1252/Unicode issues
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

async def reprocess_all():
    logger.info("Connecting to database...")
    async with AsyncSessionLocal() as session:
        # 1. Truncate document_chunks table
        logger.info("Truncating document_chunks table...")
        await session.execute(text("TRUNCATE TABLE document_chunks CASCADE;"))
        await session.commit()
        logger.info("✓ document_chunks table truncated.")

        # 2. Get all documents
        logger.info("Fetching all documents...")
        result = await session.execute(select(Document))
        documents = result.scalars().all()
        logger.info(f"Found {len(documents)} documents to re-process.")

        # 3. Process each document using isolated sessions/transactions
        for doc in documents:
            file_path = Path(doc.file_path)
            if not file_path.exists():
                logger.warning(f"File not found on disk: {file_path}. Skipping.")
                continue

            logger.info(f"Re-processing document: {doc.original_filename} (ID: {doc.id})")
            
            # Use a separate sub-transaction/session for each document to keep errors isolated
            async with AsyncSessionLocal() as doc_session:
                try:
                    # Reset status to processing
                    db_doc = await doc_session.get(Document, doc.id)
                    if db_doc:
                        db_doc.processing_status = "processing"
                        await doc_session.commit()

                        # Run the background processor synchronously in this context
                        await process_document_background(
                            document_id=doc.id,
                            file_path=file_path,
                            file_extension=file_path.suffix.lower(),
                            db=doc_session
                        )
                        logger.info(f"✓ Successfully re-processed {doc.original_filename}")
                except Exception as e:
                    logger.error(f"Failed to re-process {doc.original_filename}: {e}")
                    await doc_session.rollback()

if __name__ == "__main__":
    asyncio.run(reprocess_all())
