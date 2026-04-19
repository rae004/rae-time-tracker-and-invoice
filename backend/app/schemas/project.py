"""Pydantic schemas for Project model."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProjectBase(BaseModel):
    """Base schema for Project."""

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None)
    is_active: bool = Field(default=True)


class ProjectCreate(ProjectBase):
    """Schema for creating a Project."""

    client_id: UUID


class ProjectUpdate(BaseModel):
    """Schema for updating a Project."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    is_active: bool | None = None
    client_id: UUID | None = None


class ProjectResponse(ProjectBase):
    """Schema for Project response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    client_id: UUID
    created_at: datetime
    updated_at: datetime


class ProjectWithClientResponse(ProjectResponse):
    """Schema for Project response with client info."""

    client_name: str | None = None


class ProjectListResponse(BaseModel):
    """Schema for list of Projects."""

    projects: list[ProjectResponse]
    total: int
