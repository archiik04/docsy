import uuid

from sqlalchemy import Column, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4
    )

    email: Mapped[str] = mapped_column(
        String,
        unique=True,
        index=True
    )

    role = Column(
        String,
        default="user"
    )

    full_name: Mapped[str]

    hashed_password: Mapped[str]