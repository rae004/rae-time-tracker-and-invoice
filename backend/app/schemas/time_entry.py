"""Pydantic schemas for TimeEntry model."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.category_tag import CategoryTagResponse


class TimeEntryBase(BaseModel):
    """Base schema for TimeEntry."""

    name: str = Field(..., min_length=1, max_length=500)
    project_id: UUID


class TimeEntryCreate(BaseModel):
    """Schema for creating a TimeEntry."""

    name: str = Field(default="Untitled", max_length=500)
    project_id: UUID | None = None
    start_time: datetime | None = None  # If None, use current time
    end_time: datetime | None = None
    tag_ids: list[UUID] = Field(default_factory=list)


class TimeEntryUpdate(BaseModel):
    """Schema for updating a TimeEntry."""

    name: str | None = Field(None, min_length=1, max_length=500)
    project_id: UUID | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    tag_ids: list[UUID] | None = None


class TimeEntryResponse(BaseModel):
    """Schema for TimeEntry response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID | None
    name: str
    start_time: datetime
    end_time: datetime | None
    duration_ms: int | None
    is_running: bool
    created_at: datetime
    updated_at: datetime
    tags: list[CategoryTagResponse] = Field(default_factory=list)


class TimeEntryWithProjectResponse(TimeEntryResponse):
    """Schema for TimeEntry response with project info."""

    project_name: str | None = None
    client_name: str | None = None


class TimeEntryListResponse(BaseModel):
    """Schema for list of TimeEntries."""

    entries: list[TimeEntryResponse]
    total: int


class ActiveTimerResponse(BaseModel):
    """Schema for active timer response."""

    active_entry: TimeEntryResponse | None = None


class WeeklyEntriesResponse(BaseModel):
    """Schema for weekly entries grouped by day."""

    week_start: datetime
    week_end: datetime
    entries_by_day: dict[
        str, list[TimeEntryWithProjectResponse]
    ]  # date string -> entries
    daily_totals: dict[str, int]  # date string -> milliseconds
    weekly_total: int  # total milliseconds
