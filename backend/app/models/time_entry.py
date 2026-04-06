"""TimeEntry model for tracking work time."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import Base


class TimeEntry(Base):
    """TimeEntry model for tracking time spent on projects."""

    __tablename__ = "time_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    end_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )  # Null means timer is running
    duration_seconds: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )  # Computed when timer stops
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="time_entries")
    tags: Mapped[list["CategoryTag"]] = relationship(
        "CategoryTag",
        secondary="time_entry_tags",
        back_populates="time_entries",
    )
    invoice_line_items: Mapped[list["InvoiceLineItem"]] = relationship(
        "InvoiceLineItem", back_populates="time_entry"
    )

    @property
    def is_running(self) -> bool:
        """Check if the timer is currently running."""
        return self.end_time is None

    @property
    def duration_hours(self) -> float | None:
        """Get duration in hours."""
        if self.duration_seconds is None:
            return None
        return round(self.duration_seconds / 3600, 2)

    def __repr__(self) -> str:
        return f"<TimeEntry {self.name}>"


# Import at the bottom to avoid circular imports
from app.models.project import Project  # noqa: E402, F401
from app.models.category_tag import CategoryTag  # noqa: E402, F401
from app.models.invoice_line_item import InvoiceLineItem  # noqa: E402, F401
