"""PDF generation service for invoices."""

import os
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session
from weasyprint import HTML

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


def generate_invoice_pdf(session: Session, invoice: Invoice) -> str:
    """Generate a PDF for an invoice.

    Returns the path to the generated PDF file.
    """
    # Get user profile for contractor info
    profile = get_user_profile(session)
    if not profile:
        raise ValueError("User profile not configured")

    # Ensure output directory exists
    output_dir = Path(os.environ.get("INVOICE_PDF_DIR", "/app/invoices"))
    output_dir.mkdir(parents=True, exist_ok=True)

    # Prepare template context
    context = {
        "invoice": invoice,
        "profile": profile,
        "client": invoice.client,
        "line_items": sorted(invoice.line_items, key=lambda x: (x.work_date, x.sort_order)),
        "format_currency": format_currency,
        "format_hours": format_hours,
        "format_tax_rate": format_tax_rate,
    }

    # Render HTML template
    env = get_template_env()
    template = env.get_template("invoice.html")
    html_content = template.render(**context)

    # Generate PDF
    pdf_path = output_dir / f"invoice_{invoice.invoice_number}.pdf"
    HTML(string=html_content).write_pdf(str(pdf_path))

    return str(pdf_path)
