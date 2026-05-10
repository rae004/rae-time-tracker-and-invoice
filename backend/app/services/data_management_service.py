"""Service layer for full-data export, import, and reset."""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models import (
    CategoryTag,
    Client,
    Invoice,
    InvoiceLineItem,
    Project,
    TimeEntry,
    UserProfile,
)
from app.schemas.data_management import (
    EXPORT_VERSION,
    CategoryTagExport,
    ClientExport,
    DataExport,
    DataExportPayload,
    DataImport,
    ImportCounts,
    InvoiceExport,
    InvoiceLineItemExport,
    ProjectExport,
    TimeEntryExport,
    UserProfileExport,
)


def build_export(session: Session) -> DataExport:
    """Build a full DataExport from the current database state."""
    profile = session.query(UserProfile).first()
    user_profile = (
        UserProfileExport.model_validate(profile, from_attributes=True)
        if profile
        else None
    )

    tags = session.query(CategoryTag).order_by(CategoryTag.name).all()
    category_tags = [
        CategoryTagExport.model_validate(t, from_attributes=True) for t in tags
    ]

    clients = session.query(Client).order_by(Client.name).all()
    client_exports = [
        ClientExport.model_validate(c, from_attributes=True) for c in clients
    ]

    projects = session.query(Project).order_by(Project.name).all()
    project_exports = [
        ProjectExport(
            name=p.name,
            description=p.description,
            is_active=p.is_active,
            client_name=p.client.name,
        )
        for p in projects
    ]

    time_entries = session.query(TimeEntry).order_by(TimeEntry.start_time).all()
    time_entry_exports = [
        TimeEntryExport(
            name=te.name,
            start_time=te.start_time,
            end_time=te.end_time,
            duration_ms=te.duration_ms,
            project_name=te.project.name if te.project else None,
            client_name=te.project.client.name if te.project else None,
            tag_names=[t.name for t in te.tags],
        )
        for te in time_entries
    ]

    invoices = session.query(Invoice).order_by(Invoice.invoice_number).all()
    invoice_exports = [
        InvoiceExport(
            invoice_number=inv.invoice_number,
            client_name=inv.client.name,
            period_start=inv.period_start,
            period_end=inv.period_end,
            hourly_rate=inv.hourly_rate,
            subtotal=inv.subtotal,
            tax_rate=inv.tax_rate,
            other_charges=inv.other_charges,
            total=inv.total,
            status=inv.status,
            line_items=[
                InvoiceLineItemExport(
                    project_name=li.project_name,
                    time_entry_name=li.time_entry_name,
                    work_date=li.work_date,
                    hours=li.hours,
                    amount=li.amount,
                    sort_order=li.sort_order,
                )
                for li in sorted(
                    inv.line_items, key=lambda x: (x.sort_order, x.work_date)
                )
            ],
        )
        for inv in invoices
    ]

    return DataExport(
        export_version=EXPORT_VERSION,
        export_date=datetime.now(UTC),
        data=DataExportPayload(
            user_profile=user_profile,
            category_tags=category_tags,
            clients=client_exports,
            projects=project_exports,
            time_entries=time_entry_exports,
            invoices=invoice_exports,
        ),
    )


def apply_import(session: Session, payload: DataImport) -> ImportCounts:
    """Append payload to existing data, skipping duplicates by name/number.

    Resolution rules:
      - UserProfile: skip if any profile exists, else create.
      - CategoryTag: matched by name; skipped if exists.
      - Client: matched by name; skipped if exists.
      - Project: matched by (client_name, name); skipped if exists.
      - TimeEntry: always created new. project + tags resolved by name when present.
      - Invoice: matched by invoice_number; skipped if exists. Line items created new.
    """
    counts = ImportCounts()
    data = payload.data

    # User profile (singleton)
    if data.user_profile:
        existing_profile = session.query(UserProfile).first()
        if existing_profile:
            counts.user_profile_skipped = 1
        else:
            session.add(UserProfile(**data.user_profile.model_dump()))
            counts.user_profile_created = 1

    # Tags
    tag_by_name: dict[str, CategoryTag] = {
        t.name: t for t in session.query(CategoryTag).all()
    }
    for tag_export in data.category_tags:
        if tag_export.name in tag_by_name:
            counts.category_tags_skipped += 1
            continue
        tag = CategoryTag(name=tag_export.name, color=tag_export.color)
        session.add(tag)
        tag_by_name[tag.name] = tag
        counts.category_tags_created += 1

    # Clients
    client_by_name: dict[str, Client] = {c.name: c for c in session.query(Client).all()}
    for client_export in data.clients:
        if client_export.name in client_by_name:
            counts.clients_skipped += 1
            continue
        client = Client(**client_export.model_dump())
        session.add(client)
        client_by_name[client.name] = client
        counts.clients_created += 1

    session.flush()

    # Projects
    project_by_key: dict[tuple[str, str], Project] = {
        (p.client.name, p.name): p for p in session.query(Project).all()
    }
    for project_export in data.projects:
        client = client_by_name.get(project_export.client_name)
        if not client:
            counts.projects_skipped += 1
            continue
        key = (project_export.client_name, project_export.name)
        if key in project_by_key:
            counts.projects_skipped += 1
            continue
        project = Project(
            client_id=client.id,
            name=project_export.name,
            description=project_export.description,
            is_active=project_export.is_active,
        )
        session.add(project)
        project_by_key[key] = project
        counts.projects_created += 1

    session.flush()

    # Time entries (always new). Resolve project + tags by name.
    for te_export in data.time_entries:
        project_id = None
        if te_export.project_name:
            project = None
            if te_export.client_name:
                project = project_by_key.get(
                    (te_export.client_name, te_export.project_name)
                )
            if not project:
                project = next(
                    (
                        p
                        for (_, pname), p in project_by_key.items()
                        if pname == te_export.project_name
                    ),
                    None,
                )
            if project:
                project_id = project.id

        entry = TimeEntry(
            project_id=project_id,
            name=te_export.name,
            start_time=te_export.start_time,
            end_time=te_export.end_time,
            duration_ms=te_export.duration_ms,
        )
        for tag_name in te_export.tag_names:
            tag = tag_by_name.get(tag_name)
            if tag:
                entry.tags.append(tag)
        session.add(entry)
        counts.time_entries_created += 1

    # Invoices
    existing_invoice_numbers = {
        n for (n,) in session.query(Invoice.invoice_number).all()
    }
    for inv_export in data.invoices:
        if inv_export.invoice_number in existing_invoice_numbers:
            counts.invoices_skipped += 1
            continue
        client = client_by_name.get(inv_export.client_name)
        if not client:
            counts.invoices_skipped += 1
            continue
        invoice = Invoice(
            invoice_number=inv_export.invoice_number,
            client_id=client.id,
            period_start=inv_export.period_start,
            period_end=inv_export.period_end,
            hourly_rate=inv_export.hourly_rate,
            subtotal=inv_export.subtotal,
            tax_rate=inv_export.tax_rate,
            other_charges=inv_export.other_charges,
            total=inv_export.total,
            status=inv_export.status,
        )
        for li_export in inv_export.line_items:
            invoice.line_items.append(
                InvoiceLineItem(
                    project_name=li_export.project_name,
                    time_entry_name=li_export.time_entry_name,
                    work_date=li_export.work_date,
                    hours=li_export.hours,
                    amount=li_export.amount,
                    sort_order=li_export.sort_order,
                )
            )
            counts.invoice_line_items_created += 1
        session.add(invoice)
        existing_invoice_numbers.add(invoice.invoice_number)
        counts.invoices_created += 1

    session.commit()
    return counts


def reset_all(session: Session) -> dict[str, int]:
    """Delete every record in every table. Returns per-table delete counts."""
    deleted = {
        "invoice_line_items": session.query(InvoiceLineItem).delete(
            synchronize_session=False
        ),
        "invoices": session.query(Invoice).delete(synchronize_session=False),
        "time_entries": session.query(TimeEntry).delete(synchronize_session=False),
        "projects": session.query(Project).delete(synchronize_session=False),
        "category_tags": session.query(CategoryTag).delete(synchronize_session=False),
        "clients": session.query(Client).delete(synchronize_session=False),
        "user_profiles": session.query(UserProfile).delete(synchronize_session=False),
    }
    session.commit()
    return deleted
