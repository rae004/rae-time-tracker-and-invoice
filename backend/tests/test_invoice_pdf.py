"""End-to-end PDF generation tests.

These are the only tests that need WeasyPrint, and therefore the native GTK
libraries it binds to. They skip when it cannot be imported so the suite stays
green on a plain dev machine; CI installs the libraries so they run for real
there, and `docker compose exec api uv run pytest` runs them in the container.

Everything else about invoice rendering is covered without WeasyPrint in
test_invoice_letterhead.py.
"""

from datetime import date
from decimal import Decimal

import pytest

from app.models import Invoice, InvoiceLineItem
from app.models.invoice import InvoiceStatus
from app.services.pdf_service import generate_invoice_pdf

try:
    import weasyprint  # noqa: F401
except Exception as exc:  # pragma: no cover - depends on the host
    # Deliberately not pytest.importorskip: when the GTK libraries are absent
    # WeasyPrint raises OSError ("cannot load library 'libgobject-2.0-0'"),
    # not ImportError, so importorskip lets it escape as a collection error
    # and takes the whole suite down with it.
    pytest.skip(
        f"WeasyPrint unavailable: {exc}",
        allow_module_level=True,
    )


@pytest.fixture
def finalized_invoice(session, sample_client):
    invoice = Invoice(
        invoice_number=42,
        client_id=sample_client.id,
        period_start=date(2026, 8, 1),
        period_end=date(2026, 8, 14),
        hourly_rate=Decimal("150.00"),
        subtotal=Decimal("300.00"),
        total=Decimal("300.00"),
        status=InvoiceStatus.FINALIZED.value,
        service_description="Frozen service description",
    )
    invoice.issuer_snapshot = {
        "name": "Frozen Issuer",
        "address_line1": "1 Snapshot Way",
        "address_line2": None,
        "city": "Frozentown",
        "state": "FZ",
        "zip_code": "00001",
        "phone": "555-000-0001",
        "email": "frozen@example.com",
        "payment_instructions": "Pay the frozen issuer",
    }
    session.add(invoice)
    session.flush()
    session.add(
        InvoiceLineItem(
            invoice_id=invoice.id,
            project_name="Test Project",
            time_entry_name="Some work",
            work_date=date(2026, 8, 5),
            hours=Decimal("2.0000"),
            amount=Decimal("300.00"),
            sort_order=0,
        )
    )
    session.commit()
    return invoice


def test_generates_a_real_pdf(
    session, finalized_invoice, sample_user_profile, tmp_path, monkeypatch
):
    """The smoke test that was missing when WeasyPrint went 68 -> 69."""
    monkeypatch.setenv("INVOICE_PDF_DIR", str(tmp_path))

    path = generate_invoice_pdf(session, finalized_invoice)

    written = tmp_path / "invoice_42.pdf"
    assert written.exists()
    assert path == str(written)
    data = written.read_bytes()
    assert data.startswith(b"%PDF-")
    assert len(data) > 1000


def test_pdf_is_written_from_the_snapshot(
    session, finalized_invoice, sample_user_profile, tmp_path, monkeypatch
):
    """Regenerating after a profile edit must not change the document."""
    monkeypatch.setenv("INVOICE_PDF_DIR", str(tmp_path))
    pypdf = pytest.importorskip("pypdf")

    sample_user_profile.name = "Renamed After Finalize"
    session.commit()

    generate_invoice_pdf(session, finalized_invoice)

    text = "".join(
        page.extract_text()
        for page in pypdf.PdfReader(str(tmp_path / "invoice_42.pdf")).pages
    )
    assert "Frozen Issuer" in text
    assert "Renamed After Finalize" not in text
