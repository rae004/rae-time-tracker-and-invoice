"""Pydantic schemas for UserProfile model."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserProfileBase(BaseModel):
    """Base schema for UserProfile."""

    name: str = Field(..., min_length=1, max_length=255)
    address_line1: str = Field(..., min_length=1, max_length=255)
    address_line2: str | None = Field(None, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=50)
    zip_code: str = Field(..., min_length=1, max_length=20)
    email: EmailStr
    phone: str = Field(..., min_length=1, max_length=50)
    payment_instructions: str = Field(default="")


class UserProfileCreate(UserProfileBase):
    """Schema for creating a UserProfile."""

    pass


class UserProfileUpdate(BaseModel):
    """Schema for updating a UserProfile."""

    name: str | None = Field(None, min_length=1, max_length=255)
    address_line1: str | None = Field(None, min_length=1, max_length=255)
    address_line2: str | None = Field(None, max_length=255)
    city: str | None = Field(None, min_length=1, max_length=100)
    state: str | None = Field(None, min_length=1, max_length=50)
    zip_code: str | None = Field(None, min_length=1, max_length=20)
    email: EmailStr | None = None
    phone: str | None = Field(None, min_length=1, max_length=50)
    payment_instructions: str | None = None


class UserProfileResponse(UserProfileBase):
    """Schema for UserProfile response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    next_invoice_number: int
    created_at: datetime
    updated_at: datetime
