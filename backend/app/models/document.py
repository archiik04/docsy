import uuid

from datetime import datetime

from sqlalchemy import String
from sqlalchemy import ForeignKey
from sqlalchemy import DateTime
from sqlalchemy import Integer

from sqlalchemy.dialects.postgresql import UUID

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column

from app.core.database import Base
from enum import Enum
from sqlalchemy import Enum as SQLEnum


class DocumentScope(str, Enum):
    PERSONAL = "PERSONAL"
    KNOWLEDGE_BASE = "KNOWLEDGE_BASE"


class Document(Base):

    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    filename: Mapped[str] = mapped_column(String)

    original_filename: Mapped[str] = mapped_column(String)

    file_path: Mapped[str] = mapped_column(String)

    content_type: Mapped[str] = mapped_column(String)

    file_size: Mapped[int] = mapped_column(Integer)

    processing_status: Mapped[str] = mapped_column(
        String,
        default="uploaded"
    )

    scope: Mapped[DocumentScope] = mapped_column(
        SQLEnum(DocumentScope, name="doc_scope"),
        default=DocumentScope.PERSONAL,
        nullable=False
    )

    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

    extracted_text: Mapped[str] = mapped_column(
    String,
    nullable=True
    )
