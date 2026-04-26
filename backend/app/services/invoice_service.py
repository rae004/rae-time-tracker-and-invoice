"""Business logic for invoice operations."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from app.models import Client, Invoice, InvoiceLineItem, Project, TimeEntry, UserProfile
from app.models.invoice import InvoiceStatus


def get_user_profile(session: Session) -> UserProfile | None:
    """Get the user profile (single row)."""
    return session.query(UserProfile).first()


def get_time_entries_for_invoice(
    session: Session,
    client_id: UUID,
    period_start: date,
    period_end: date,
    exclude_entry_ids: list[UUID] | None = None,
) -> list[TimeEntry]:
    """Get completed time entries for a client within a date range.

    Only includes entries that:
    - Belong to a project owned by the client
    - Have been completed (end_time is not null)
    - Fall within the date range (based on start_time date)
    """
    query = (
        session.query(TimeEntry)
        .join(Project)
        .filter(
            and_(
                Project.client_id == client_id,
                TimeEntry.end_time.isnot(None),  # Only completed entries
                TimeEntry.start_time >= period_start,
                TimeEntry.start_time
                < date(period_end.year, period_end.month, period_end.day + 1)
                if period_end.day < 28
                else period_end,  # Handle end of month
            )
        )
        .options(joinedload(TimeEntry.project))
    )

    if exclude_entry_ids:
        query = query.filter(TimeEntry.id.notin_(exclude_entry_ids))

    return query.order_by(TimeEntry.start_time).all()


def create_line_items_from_entries(
    entries: list[TimeEntry],
    hourly_rate: Decimal,
) -> list[dict]:
    """Convert time entries to invoice line item data."""
    line_items = []

    for i, entry in enumerate(entries):
        hours = (Decimal(str(entry.duration_ms or 0)) / Decimal("3600000")).quantize(
            Decimal("0.0001")
        )
        amount = hours * hourly_rate

        line_items.append(
            {
                "time_entry_id": entry.id,
                "project_name": entry.project.name,
                "time_entry_name": entry.name,
                "work_date": entry.start_time.date(),
                "hours": hours,
                "amount": amount,
                "sort_order": i,
            }
        )

    return line_items


def calculate_invoice_totals(
    line_items: list[dict],
    tax_rate: Decimal = Decimal("0.00"),
    other_charges: Decimal = Decimal("0.00"),
) -> tuple[Decimal, Decimal]:
    """Calculate subtotal and total for invoice.

    Returns (subtotal, total).
    """
    subtotal = sum((item["amount"] for item in line_items), Decimal("0.00"))
    tax_amount = subtotal * tax_rate
    total = subtotal + tax_amount + other_charges
    return subtotal, total


def preview_invoice(
    session: Session,
    client_id: UUID,
    period_start: date,
    period_end: date,
    exclude_entry_ids: list[UUID] | None = None,
) -> dict:
    """Generate invoice preview data without creating the invoice."""
    client = session.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise ValueError(f"Client not found: {client_id}")

    entries = get_time_entries_for_invoice(
        session, client_id, period_start, period_end, exclude_entry_ids
    )

    hourly_rate = client.hourly_rate
    line_items = create_line_items_from_entries(entries, hourly_rate)
    subtotal, total = calculate_invoice_totals(line_items)

    return {
        "client_id": client_id,
        "client_name": client.name,
        "period_start": period_start,
        "period_end": period_end,
        "hourly_rate": hourly_rate,
        "line_items": line_items,
        "subtotal": subtotal,
        "tax_rate": Decimal("0.00"),
        "other_charges": Decimal("0.00"),
        "total": total,
    }


def create_invoice(
    session: Session,
    client_id: UUID,
    period_start: date,
    period_end: date,
    line_items_data: list[dict],
    hourly_rate: Decimal,
    tax_rate: Decimal = Decimal("0.00"),
    other_charges: Decimal = Decimal("0.00"),
) -> Invoice:
    """Create a new invoice with line items."""
    # Get user profile and increment invoice number
    profile = get_user_profile(session)
    if not profile:
        raise ValueError("User profile not configured")

    invoice_number = profile.get_and_increment_invoice_number()

    # Calculate totals
    subtotal, total = calculate_invoice_totals(line_items_data, tax_rate, other_charges)

    # Create invoice
    invoice = Invoice(
        invoice_number=invoice_number,
        client_id=client_id,
        period_start=period_start,
        period_end=period_end,
        hourly_rate=hourly_rate,
        subtotal=subtotal,
        tax_rate=tax_rate,
        other_charges=other_charges,
        total=total,
        status=InvoiceStatus.DRAFT.value,
    )
    session.add(invoice)
    session.flush()  # Get the invoice ID

    # Create line items
    for item_data in line_items_data:
        line_item = InvoiceLineItem(
            invoice_id=invoice.id,
            time_entry_id=item_data.get("time_entry_id"),
            project_name=item_data["project_name"],
            time_entry_name=item_data.get("time_entry_name"),
            work_date=item_data["work_date"],
            hours=item_data["hours"],
            amount=item_data["amount"],
            sort_order=item_data.get("sort_order", 0),
        )
        session.add(line_item)

    session.flush()
    return invoice


def create_invoice_from_entries(
    session: Session,
    client_id: UUID,
    period_start: date,
    period_end: date,
    exclude_entry_ids: list[UUID] | None = None,
    tax_rate: Decimal = Decimal("0.00"),
    other_charges: Decimal = Decimal("0.00"),
) -> Invoice:
    """Create an invoice directly from time entries."""
    client = session.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise ValueError(f"Client not found: {client_id}")

    entries = get_time_entries_for_invoice(
        session, client_id, period_start, period_end, exclude_entry_ids
    )

    if not entries:
        raise ValueError("No time entries found for the specified period")

    line_items_data = create_line_items_from_entries(entries, client.hourly_rate)

    return create_invoice(
        session,
        client_id,
        period_start,
        period_end,
        line_items_data,
        client.hourly_rate,
        tax_rate,
        other_charges,
    )


def finalize_invoice(session: Session, invoice: Invoice) -> Invoice:
    """Finalize an invoice (marks as finalized, cannot be edited after)."""
    if invoice.is_finalized:
        raise ValueError("Invoice is already finalized")

    invoice.status = InvoiceStatus.FINALIZED.value
    session.flush()
    return invoice


def get_invoice_with_details(session: Session, invoice_id: UUID) -> Invoice | None:
    """Get an invoice with all related data loaded."""
    return (
        session.query(Invoice)
        .options(
            joinedload(Invoice.client),
            joinedload(Invoice.line_items),
        )
        .filter(Invoice.id == invoice_id)
        .first()
    )


def get_invoices(
    session: Session,
    client_id: UUID | None = None,
    status: str | None = None,
) -> list[Invoice]:
    """Get all invoices with optional filtering."""
    query = session.query(Invoice).options(joinedload(Invoice.client))

    if client_id:
        query = query.filter(Invoice.client_id == client_id)

    if status:
        query = query.filter(Invoice.status == status)

    return query.order_by(Invoice.created_at.desc()).all()


def delete_invoice(session: Session, invoice: Invoice) -> None:
    """Delete a draft invoice."""
    if invoice.is_finalized:
        raise ValueError("Cannot delete a finalized invoice")

    session.delete(invoice)
    session.flush()
