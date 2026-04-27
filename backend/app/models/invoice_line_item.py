"""InvoiceLineItem model for invoice details."""

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import Base


class InvoiceLineItem(Base):
    """InvoiceLineItem model for individual invoice entries."""

    __tablename__ = "invoice_line_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False
    )
    time_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("time_entries.id"), nullable=True
    )  # Reference to original time entry
    project_name: Mapped[str] = mapped_column(
        String(255), nullable=False
    )  # Snapshot of project name
    time_entry_name: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )  # Snapshot of time entry name (the "What are you working on?" value)
    work_date: Mapped[date] = mapped_column(Date, nullable=False)
    hours: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="line_items")
    time_entry: Mapped["TimeEntry | None"] = relationship(
        "TimeEntry", back_populates="invoice_line_items"
    )

    def __repr__(self) -> str:
        return f"<InvoiceLineItem {self.project_name} - {self.work_date}>"


# Import at the bottom to avoid circular imports
from app.models.invoice import Invoice  # noqa: E402, F401
from app.models.time_entry import TimeEntry  # noqa: E402, F401
