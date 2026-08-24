import uuid

from datetime import datetime

from sqlalchemy import Column, ForeignKey, String
from sqlalchemy import Integer
from sqlalchemy import DateTime
from sqlalchemy import Computed

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column

from sqlalchemy.dialects.postgresql import TSVECTOR, UUID

from pgvector.sqlalchemy import Vector

from app.core.database import Base


class DocumentChunk(Base):

    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id")
    )

    chunk_index: Mapped[int] = mapped_column(
        Integer
    )

    chunk_text: Mapped[str]

    embedding: Mapped[list] = mapped_column(
        Vector(384)
    )

    # STORED generated column, auto-derived from chunk_text by Postgres on
    # every insert/update. Previously this was a plain nullable column that
    # nothing in the app ever populated, so every ts_rank() call in
    # retrieval_service.py scored against NULL and the "keyword" half of
    # hybrid search never contributed anything. See migration that fixes
    # this in-place plus the GIN index that makes it fast.
    fts = mapped_column(
        TSVECTOR,
        Computed("to_tsvector('english', chunk_text)", persisted=True)
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )
    page_number: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    section_title: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
        default="General"
    )