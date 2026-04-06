"""TimeEntryTag association table for many-to-many relationship."""

from sqlalchemy import Column, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID

from app.extensions import Base

# Association table for TimeEntry <-> CategoryTag many-to-many relationship
time_entry_tags = Table(
    "time_entry_tags",
    Base.metadata,
    Column(
        "time_entry_id",
        UUID(as_uuid=True),
        ForeignKey("time_entries.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "category_tag_id",
        UUID(as_uuid=True),
        ForeignKey("category_tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)
