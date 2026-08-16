"""PDF generation service for invoices."""

import os
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session

from app.models import Invoice, UserProfile


def get_template_env() -> Environment:
    """Get Jinja2 environment for templates."""
    template_dir = Path(__file__).parent.parent / "templates"
    return Environment(
        loader=FileSystemLoader(str(template_dir)),
        autoescape=True,
    )


def get_user_profile(session: Session) -> UserProfile | None:
    """Get the user profile."""
    return session.query(UserProfile).first()


def format_currency(amount) -> str:
    """Format a decimal as currency."""
    return f"${amount:,.2f}"


def format_hours(hours) -> str:
    """Format hours with 2 decimal places."""
    return f"{float(hours):.2f}"


def format_tax_rate(rate) -> str:
    """Format tax rate as percentage."""
    return f"{float(rate) * 100:.2f}%"


# The fields each snapshot captures. Also the contract the template renders
# against: every key here is always present in the resolved context, so the
# template never has to know whether a value came from a snapshot or from the
# live record.
ISSUER_FIELDS = (
    "name",
    "address_line1",
    "address_line2",
    "city",
    "state",
    "zip_code",
    "phone",
    "email",
    "payment_instructions",
)

BILL_TO_FIELDS = (
    "name",
    "address_line1",
    "address_line2",
    "city",
    "state",
    "zip_code",
    "phone",
)


def _resolve(snapshot: dict | None, live: object, fields: tuple[str, ...]) -> dict:
    """Resolve one letterhead block, preferring the snapshot over the live record.

    A snapshot missing an individual key falls back to the live value for that
    key rather than rendering blank, so a snapshot written by an older version
    of this code cannot punch holes in the document.
    """
    snapshot = snapshot or {}
    return {field: snapshot.get(field, getattr(live, field, None)) for field in fields}


def build_render_context(session: Session, invoice: Invoice) -> dict:
    """Build the letterhead half of the template context.

    This is the one place the snapshot-vs-live rule lives. Finalized invoices
    carry snapshots and render from them forever; drafts and pre-migration
    invoices have none and fall back to the live profile and client.

    Raises ValueError when there is nothing to render from at all -- no
    snapshot and no configured profile.
    """
    profile = get_user_profile(session)
    if profile is None and not invoice.issuer_snapshot:
        raise ValueError("User profile not configured")

    return {
        "issuer": _resolve(invoice.issuer_snapshot, profile, ISSUER_FIELDS),
        "bill_to": _resolve(invoice.bill_to_snapshot, invoice.client, BILL_TO_FIELDS),
        # Invoice content, not presentation: captured at create, so it is read
        # from the invoice and only falls back for rows that predate the column.
        "service_description": (
            invoice.service_description
            if invoice.service_description is not None
            else getattr(invoice.client, "service_description", None)
        ),
    }


def render_invoice_html(session: Session, invoice: Invoice) -> str:
    """Render the invoice to HTML.

    Split out from generate_invoice_pdf so the template can be exercised
    without WeasyPrint, which needs native GTK libraries that are absent on a
    plain dev machine.
    """
    context = {
        "invoice": invoice,
        "line_items": sorted(
            invoice.line_items, key=lambda x: (x.work_date, x.sort_order)
        ),
        "format_currency": format_currency,
        "format_hours": format_hours,
        "format_tax_rate": format_tax_rate,
        **build_render_context(session, invoice),
    }

    env = get_template_env()
    return env.get_template("invoice.html").render(**context)


def generate_invoice_pdf(session: Session, invoice: Invoice) -> str:
    """Generate a PDF for an invoice.

    Returns the path to the generated PDF file.
    """
    html_content = render_invoice_html(session, invoice)

    # Ensure output directory exists
    output_dir = Path(os.environ.get("INVOICE_PDF_DIR", "/app/invoices"))
    output_dir.mkdir(parents=True, exist_ok=True)

    pdf_path = output_dir / f"invoice_{invoice.invoice_number}.pdf"
    # Imported lazily: WeasyPrint pulls in native GTK libraries, and keeping
    # this local is what lets the rest of the suite import on a machine (or CI
    # runner) that lacks them.
    from weasyprint import HTML

    HTML(string=html_content).write_pdf(str(pdf_path))

    return str(pdf_path)
