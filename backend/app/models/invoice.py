"""Invoice model for generated invoices."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import Base

# JSONB on Postgres, plain JSON on SQLite. The test suite builds its schema with
# Base.metadata.create_all against SQLite, which cannot compile JSONB at all, so
# a bare JSONB column would fail at CREATE TABLE. (postgresql.UUID above needs no
# such treatment: in SQLAlchemy 2 it subclasses the generic Uuid and degrades on
# its own.)
JSONSnapshot = JSON().with_variant(JSONB(), "postgresql")


class InvoiceStatus(StrEnum):
    """Invoice status enum."""

    DRAFT = "draft"
    FINALIZED = "finalized"


class Invoice(Base):
    """Invoice model for billing clients."""

    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    invoice_number: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    hourly_rate: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )  # Snapshot from client
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), nullable=False, default=Decimal("0.00")
    )  # e.g., 0.0825 for 8.25%
    other_charges: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    service_description: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # Snapshot from client, captured at create
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=InvoiceStatus.DRAFT.value
    )
    pdf_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Letterhead snapshots, captured at finalize. Presentation only: they never
    # affect money. Null on drafts and on pre-migration invoices, in which case
    # the renderer falls back to the live profile/client.
    issuer_snapshot: Mapped[dict | None] = mapped_column(JSONSnapshot, nullable=True)
    bill_to_snapshot: Mapped[dict | None] = mapped_column(JSONSnapshot, nullable=True)
    letterhead_refreshed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    client: Mapped["Client"] = relationship("Client", back_populates="invoices")
    line_items: Mapped[list["InvoiceLineItem"]] = relationship(
        "InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan"
    )

    @property
    def is_draft(self) -> bool:
        """Check if invoice is a draft."""
        return self.status == InvoiceStatus.DRAFT.value

    @property
    def is_finalized(self) -> bool:
        """Check if invoice is finalized."""
        return self.status == InvoiceStatus.FINALIZED.value

    def calculate_totals(self) -> None:
        """Calculate subtotal and total from line items."""
        self.subtotal = sum((item.amount for item in self.line_items), Decimal("0.00"))
        tax_amount = self.subtotal * self.tax_rate
        self.total = self.subtotal + tax_amount + self.other_charges

    def __repr__(self) -> str:
        return f"<Invoice #{self.invoice_number}>"


# Import at the bottom to avoid circular imports
from app.models.client import Client  # noqa: E402, F401
from app.models.invoice_line_item import InvoiceLineItem  # noqa: E402, F401
