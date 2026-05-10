"""Pydantic schemas for the data export/import/reset feature."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

EXPORT_VERSION = "1.0"


class UserProfileExport(BaseModel):
    """Exported user profile (singleton)."""

    name: str
    address_line1: str
    address_line2: str | None = None
    city: str
    state: str
    zip_code: str
    email: str
    phone: str
    payment_instructions: str = ""
    next_invoice_number: int = 1


class CategoryTagExport(BaseModel):
    """Exported category tag. Matched by name on import."""

    name: str
    color: str = "#6B7280"


class ClientExport(BaseModel):
    """Exported client. Matched by name on import."""

    name: str
    address_line1: str
    address_line2: str | None = None
    city: str
    state: str
    zip_code: str
    phone: str | None = None
    hourly_rate: Decimal = Decimal("0.00")
    service_description: str = "Software development services"


class ProjectExport(BaseModel):
    """Exported project. Matched by (client_name, name) on import."""

    name: str
    description: str | None = None
    is_active: bool = True
    client_name: str


class TimeEntryExport(BaseModel):
    """Exported time entry. Always created new on import."""

    name: str
    start_time: datetime
    end_time: datetime | None = None
    duration_ms: int | None = None
    project_name: str | None = None
    client_name: str | None = None
    tag_names: list[str] = Field(default_factory=list)


class InvoiceLineItemExport(BaseModel):
    """Exported invoice line item. Created as child of new invoice."""

    project_name: str
    time_entry_name: str | None = None
    work_date: date
    hours: Decimal
    amount: Decimal
    sort_order: int = 0


class InvoiceExport(BaseModel):
    """Exported invoice. Matched by invoice_number on import."""

    invoice_number: int
    client_name: str
    period_start: date
    period_end: date
    hourly_rate: Decimal
    subtotal: Decimal = Decimal("0.00")
    tax_rate: Decimal = Decimal("0.00")
    other_charges: Decimal = Decimal("0.00")
    total: Decimal = Decimal("0.00")
    status: str = "draft"
    line_items: list[InvoiceLineItemExport] = Field(default_factory=list)


class DataExportPayload(BaseModel):
    """Container for all exported records."""

    user_profile: UserProfileExport | None = None
    category_tags: list[CategoryTagExport] = Field(default_factory=list)
    clients: list[ClientExport] = Field(default_factory=list)
    projects: list[ProjectExport] = Field(default_factory=list)
    time_entries: list[TimeEntryExport] = Field(default_factory=list)
    invoices: list[InvoiceExport] = Field(default_factory=list)


class DataExport(BaseModel):
    """Top-level export envelope."""

    export_version: str = EXPORT_VERSION
    export_date: datetime
    data: DataExportPayload


class DataImport(BaseModel):
    """Top-level import envelope (same shape as export)."""

    export_version: str
    export_date: datetime | None = None
    data: DataExportPayload


class ImportCounts(BaseModel):
    """Per-resource counts returned from an import."""

    user_profile_created: int = 0
    user_profile_skipped: int = 0
    category_tags_created: int = 0
    category_tags_skipped: int = 0
    clients_created: int = 0
    clients_skipped: int = 0
    projects_created: int = 0
    projects_skipped: int = 0
    time_entries_created: int = 0
    invoices_created: int = 0
    invoices_skipped: int = 0
    invoice_line_items_created: int = 0


class ImportResult(BaseModel):
    """Response body for a successful import."""

    success: bool = True
    counts: ImportCounts


class ResetResult(BaseModel):
    """Response body for a successful reset."""

    success: bool = True
    deleted: dict[str, int]
