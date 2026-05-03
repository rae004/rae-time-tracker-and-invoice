"""Pydantic schemas for Invoice and InvoiceLineItem models."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InvoiceLineItemBase(BaseModel):
    """Base schema for InvoiceLineItem."""

    project_name: str = Field(..., min_length=1, max_length=255)
    time_entry_name: str | None = Field(default=None, max_length=500)
    work_date: date
    hours: Decimal = Field(..., ge=0)
    amount: Decimal = Field(..., ge=0)
    sort_order: int = Field(default=0)


class InvoiceLineItemCreate(InvoiceLineItemBase):
    """Schema for creating an InvoiceLineItem."""

    time_entry_id: UUID | None = None


class InvoiceLineItemResponse(InvoiceLineItemBase):
    """Schema for InvoiceLineItem response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_id: UUID
    time_entry_id: UUID | None


class InvoiceBase(BaseModel):
    """Base schema for Invoice."""

    client_id: UUID
    period_start: date
    period_end: date
    hourly_rate: Decimal = Field(..., ge=0)
    tax_rate: Decimal = Field(default=Decimal("0.00"), ge=0)
    other_charges: Decimal = Field(default=Decimal("0.00"))


class InvoiceCreate(InvoiceBase):
    """Schema for creating an Invoice."""

    line_items: list[InvoiceLineItemCreate] = Field(default_factory=list)


class InvoiceUpdate(BaseModel):
    """Schema for updating an Invoice (only for draft invoices)."""

    period_start: date | None = None
    period_end: date | None = None
    hourly_rate: Decimal | None = Field(None, ge=0)
    tax_rate: Decimal | None = Field(None, ge=0)
    other_charges: Decimal | None = None
    line_items: list[InvoiceLineItemCreate] | None = None


class InvoiceResponse(BaseModel):
    """Schema for Invoice response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_number: int
    client_id: UUID
    period_start: date
    period_end: date
    hourly_rate: Decimal
    subtotal: Decimal
    tax_rate: Decimal
    other_charges: Decimal
    total: Decimal
    status: str
    pdf_path: str | None
    created_at: datetime
    line_items: list[InvoiceLineItemResponse] = Field(default_factory=list)


class InvoiceWithClientResponse(InvoiceResponse):
    """Schema for Invoice response with client info."""

    client_name: str | None = None


class InvoiceListResponse(BaseModel):
    """Schema for list of Invoices."""

    invoices: list[InvoiceWithClientResponse]
    total: int


class InvoicePreviewRequest(BaseModel):
    """Schema for previewing an invoice before creation."""

    client_id: UUID
    period_start: date
    period_end: date
    exclude_entry_ids: list[UUID] = Field(default_factory=list)


class InvoicePreviewLineItem(InvoiceLineItemBase):
    """Preview-only line item shape with grouping metadata."""

    time_entry_id: UUID | None = None
    source_entry_ids: list[UUID] = Field(default_factory=list)


class InvoicePreviewResponse(BaseModel):
    """Schema for invoice preview data."""

    client_id: UUID
    client_name: str
    period_start: date
    period_end: date
    hourly_rate: Decimal
    line_items: list[InvoicePreviewLineItem]
    subtotal: Decimal
    tax_rate: Decimal
    other_charges: Decimal
    total: Decimal
