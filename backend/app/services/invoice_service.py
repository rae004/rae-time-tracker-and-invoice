"""Business logic for invoice operations."""

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy.orm import Session, joinedload

from app.models import Client, Invoice, InvoiceLineItem, Project, TimeEntry, UserProfile
from app.models.invoice import InvoiceStatus
from app.services.pdf_service import BILL_TO_FIELDS, ISSUER_FIELDS


def get_user_profile(session: Session) -> UserProfile | None:
    """Get the user profile (single row)."""
    return session.query(UserProfile).first()


def _snapshot(source: object, fields: tuple[str, ...]) -> dict:
    """Copy `fields` off a live record into a plain dict."""
    return {field: getattr(source, field, None) for field in fields}


def capture_letterhead(session: Session, invoice: Invoice) -> None:
    """Freeze the issuer and bill-to details onto the invoice.

    Called at finalize. Uses the same field tuples the renderer resolves
    against, so what gets captured and what gets rendered cannot drift apart.

    Presentation only: this never touches hourly_rate, line items or totals.
    """
    profile = get_user_profile(session)
    if not profile:
        raise ValueError("User profile not configured")

    invoice.issuer_snapshot = _snapshot(profile, ISSUER_FIELDS)
    invoice.bill_to_snapshot = _snapshot(invoice.client, BILL_TO_FIELDS)


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
    - Fall within the date range (based on start_time date), inclusive of both
      period_start and period_end
    """
    # start_time is a timestamp, so the upper bound is exclusive against the day
    # after period_end; that keeps entries recorded later in the day on
    # period_end itself.
    period_end_exclusive = period_end + timedelta(days=1)

    query = (
        session.query(TimeEntry)
        .join(Project)
        .filter(
            and_(
                Project.client_id == client_id,
                TimeEntry.end_time.isnot(None),  # Only completed entries
                TimeEntry.start_time >= period_start,
                TimeEntry.start_time < period_end_exclusive,
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
    """Convert time entries to invoice line item data.

    Entries that share the same (project_id, time_entry_name, work_date) are
    combined into a single line item with summed hours and amount. The
    `time_entry_id` field is preserved for singleton groups and set to None
    for combined groups. `source_entry_ids` always lists the contributing
    entry IDs (useful for preview UIs; not persisted).
    """
    groups: dict[tuple, dict] = {}

    for entry in entries:
        hours = (Decimal(str(entry.duration_ms or 0)) / Decimal("3600000")).quantize(
            Decimal("0.0001")
        )
        amount = hours * hourly_rate
        work_date = entry.start_time.date()
        key = (entry.project_id, entry.name, work_date)

        group = groups.get(key)
        if group is None:
            groups[key] = {
                "time_entry_id": entry.id,
                "project_name": entry.project.name,
                "time_entry_name": entry.name,
                "work_date": work_date,
                "hours": hours,
                "amount": amount,
                "source_entry_ids": [entry.id],
            }
        else:
            group["hours"] += hours
            group["amount"] += amount
            group["source_entry_ids"].append(entry.id)
            group["time_entry_id"] = None  # Combined groups lose the 1:1 link

    line_items = sorted(
        groups.values(),
        key=lambda g: (g["work_date"], g["project_name"], g["time_entry_name"] or ""),
    )
    for i, item in enumerate(line_items):
        item["sort_order"] = i

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

    # Invoice content, so it is frozen here rather than at finalize -- the same
    # rule hourly_rate already follows. Editing the client's description later
    # must not rewrite what an existing invoice was raised for.
    client = session.query(Client).filter(Client.id == client_id).first()

    # Create invoice
    invoice = Invoice(
        invoice_number=invoice_number,
        client_id=client_id,
        period_start=period_start,
        period_end=period_end,
        hourly_rate=hourly_rate,
        service_description=getattr(client, "service_description", None),
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

    # Finalizing is the moment the document stops tracking the live records.
    capture_letterhead(session, invoice)
    invoice.status = InvoiceStatus.FINALIZED.value
    session.flush()
    return invoice


def refresh_letterhead(session: Session, invoice: Invoice) -> Invoice:
    """Re-capture the letterhead on an issued invoice from the current records.

    Deliberately distinct from regenerating the PDF. Regenerating rebuilds a
    derived file and always produces the same document; this changes what the
    document says, which is why it stamps letterhead_refreshed_at and why the
    UI asks before calling it.

    Presentation only -- hourly_rate, line items and totals are untouched, so
    an issued invoice can never change what it charges.
    """
    if not invoice.is_finalized:
        raise ValueError("Only a finalized invoice has a letterhead to refresh")

    capture_letterhead(session, invoice)
    invoice.letterhead_refreshed_at = datetime.now(UTC)
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
