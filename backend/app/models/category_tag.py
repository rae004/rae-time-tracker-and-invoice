"""CategoryTag model for labeling time entries."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import Base


class CategoryTag(Base):
    """CategoryTag model for categorizing time entries."""

    __tablename__ = "category_tags"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    color: Mapped[str] = mapped_column(
        String(7), nullable=False, default="#6B7280"
    )  # Hex color code
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    time_entries: Mapped[list["TimeEntry"]] = relationship(
        "TimeEntry",
        secondary="time_entry_tags",
        back_populates="tags",
    )

    def __repr__(self) -> str:
        return f"<CategoryTag {self.name}>"


# Import at the bottom to avoid circular imports
from app.models.time_entry import TimeEntry  # noqa: E402, F401
