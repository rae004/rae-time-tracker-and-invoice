"""Pydantic schemas for Client model."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ClientBase(BaseModel):
    """Base schema for Client."""

    name: str = Field(..., min_length=1, max_length=255)
    address_line1: str = Field(..., min_length=1, max_length=255)
    address_line2: str | None = Field(None, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=50)
    zip_code: str = Field(..., min_length=1, max_length=20)
    phone: str | None = Field(None, max_length=50)
    hourly_rate: Decimal = Field(default=Decimal("0.00"), ge=0)
    service_description: str = Field(
        default="Software development services", max_length=500
    )


class ClientCreate(ClientBase):
    """Schema for creating a Client."""

    pass


class ClientUpdate(BaseModel):
    """Schema for updating a Client."""

    name: str | None = Field(None, min_length=1, max_length=255)
    address_line1: str | None = Field(None, min_length=1, max_length=255)
    address_line2: str | None = Field(None, max_length=255)
    city: str | None = Field(None, min_length=1, max_length=100)
    state: str | None = Field(None, min_length=1, max_length=50)
    zip_code: str | None = Field(None, min_length=1, max_length=20)
    phone: str | None = Field(None, max_length=50)
    hourly_rate: Decimal | None = Field(None, ge=0)
    service_description: str | None = Field(None, max_length=500)


class ClientResponse(ClientBase):
    """Schema for Client response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class ClientListResponse(BaseModel):
    """Schema for list of Clients."""

    clients: list[ClientResponse]
    total: int
