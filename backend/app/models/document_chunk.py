import uuid

from datetime import datetime

from sqlalchemy import Column, ForeignKey, String
from sqlalchemy import Integer
from sqlalchemy import DateTime

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column

from sqlalchemy.dialects.postgresql import UUID

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

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )
    page_number = Column(Integer)
    section_title = Column(String, nullable=True)