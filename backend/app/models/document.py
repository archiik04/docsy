import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )

    filename: Mapped[str]

    extracted_text: Mapped[str]

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id")
    )