"""Pydantic schemas for CategoryTag model."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CategoryTagBase(BaseModel):
    """Base schema for CategoryTag."""

    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#6B7280", max_length=7)

    @field_validator("color")
    @classmethod
    def validate_hex_color(cls, v: str) -> str:
        """Validate that color is a valid hex color code."""
        if not v.startswith("#"):
            raise ValueError("Color must start with #")
        if len(v) != 7:
            raise ValueError("Color must be 7 characters (e.g., #RRGGBB)")
        try:
            int(v[1:], 16)
        except ValueError:
            raise ValueError("Color must be a valid hex color code")
        return v.upper()


class CategoryTagCreate(CategoryTagBase):
    """Schema for creating a CategoryTag."""

    pass


class CategoryTagUpdate(BaseModel):
    """Schema for updating a CategoryTag."""

    name: str | None = Field(None, min_length=1, max_length=100)
    color: str | None = Field(None, max_length=7)

    @field_validator("color")
    @classmethod
    def validate_hex_color(cls, v: str | None) -> str | None:
        """Validate that color is a valid hex color code."""
        if v is None:
            return v
        if not v.startswith("#"):
            raise ValueError("Color must start with #")
        if len(v) != 7:
            raise ValueError("Color must be 7 characters (e.g., #RRGGBB)")
        try:
            int(v[1:], 16)
        except ValueError:
            raise ValueError("Color must be a valid hex color code")
        return v.upper()


class CategoryTagResponse(CategoryTagBase):
    """Schema for CategoryTag response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime


class CategoryTagListResponse(BaseModel):
    """Schema for list of CategoryTags."""

    tags: list[CategoryTagResponse]
    total: int
