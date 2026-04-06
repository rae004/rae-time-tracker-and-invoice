"""Invoice model for generated invoices."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import Base


class InvoiceStatus(str, Enum):
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
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=InvoiceStatus.DRAFT.value
    )
    pdf_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
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
        self.subtotal = sum(
            (item.amount for item in self.line_items), Decimal("0.00")
        )
        tax_amount = self.subtotal * self.tax_rate
        self.total = self.subtotal + tax_amount + self.other_charges

    def __repr__(self) -> str:
        return f"<Invoice #{self.invoice_number}>"


# Import at the bottom to avoid circular imports
from app.models.client import Client  # noqa: E402, F401
from app.models.invoice_line_item import InvoiceLineItem  # noqa: E402, F401
