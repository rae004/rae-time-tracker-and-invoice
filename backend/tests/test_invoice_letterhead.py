"""Tests for the letterhead snapshot resolver and invoice HTML rendering.

These deliberately avoid WeasyPrint. The rule worth protecting -- a finalized
invoice renders from its snapshot forever, a draft renders live -- is pure
logic, and pinning it here means it stays covered on a machine without the
native GTK libraries. The one test that actually produces PDF bytes lives in
test_invoice_pdf.py and skips when WeasyPrint is unavailable.
"""

from datetime import date
from decimal import Decimal

import pytest

from app.models import Invoice, InvoiceLineItem
from app.models.invoice import InvoiceStatus
from app.services import invoice_service
from app.services.pdf_service import build_render_context, render_invoice_html

FROZEN_ISSUER = {
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

FROZEN_BILL_TO = {
    "name": "Frozen Client",
    "address_line1": "2 Snapshot Way",
    "address_line2": None,
    "city": "Frozenville",
    "state": "FZ",
    "zip_code": "00002",
    "phone": "555-000-0002",
}


def _make_invoice(session, client, **overrides):
    """A finalized invoice with one line item."""
    values = {
        "invoice_number": 1,
        "client_id": client.id,
        "period_start": date(2026, 8, 1),
        "period_end": date(2026, 8, 14),
        "hourly_rate": Decimal("150.00"),
        "subtotal": Decimal("150.00"),
        "total": Decimal("150.00"),
        "status": InvoiceStatus.FINALIZED.value,
    }
    values.update(overrides)
    invoice = Invoice(**values)
    session.add(invoice)
    session.flush()
    session.add(
        InvoiceLineItem(
            invoice_id=invoice.id,
            project_name="Test Project",
            time_entry_name="Some work",
            work_date=date(2026, 8, 5),
            hours=Decimal("1.0000"),
            amount=Decimal("150.00"),
            sort_order=0,
        )
    )
    session.commit()
    return invoice


class TestBuildRenderContext:
    """The snapshot-vs-live rule."""

    def test_snapshot_wins_over_live_profile(
        self, session, sample_client, sample_user_profile
    ):
        invoice = _make_invoice(
            session,
            sample_client,
            issuer_snapshot=FROZEN_ISSUER,
            bill_to_snapshot=FROZEN_BILL_TO,
        )

        ctx = build_render_context(session, invoice)

        assert ctx["issuer"]["name"] == "Frozen Issuer"
        assert ctx["issuer"]["email"] == "frozen@example.com"
        assert ctx["bill_to"]["name"] == "Frozen Client"
        # The live records still say something different -- that is the point.
        assert sample_user_profile.name == "John Doe"
        assert sample_client.name == "Test Company"

    def test_falls_back_to_live_when_no_snapshot(
        self, session, sample_client, sample_user_profile
    ):
        invoice = _make_invoice(session, sample_client)

        ctx = build_render_context(session, invoice)

        assert ctx["issuer"]["name"] == "John Doe"
        assert (
            ctx["issuer"]["payment_instructions"] == "Make checks payable to John Doe"
        )
        assert ctx["bill_to"]["name"] == "Test Company"

    def test_editing_the_profile_cannot_move_a_snapshotted_invoice(
        self, session, sample_client, sample_user_profile
    ):
        """The regression this whole feature exists to prevent."""
        invoice = _make_invoice(
            session, sample_client, issuer_snapshot=dict(FROZEN_ISSUER)
        )

        sample_user_profile.name = "Renamed Later"
        sample_user_profile.payment_instructions = "Totally different instructions"
        session.commit()

        ctx = build_render_context(session, invoice)

        assert ctx["issuer"]["name"] == "Frozen Issuer"
        assert ctx["issuer"]["payment_instructions"] == "Pay the frozen issuer"

    def test_partial_snapshot_falls_back_per_key(
        self, session, sample_client, sample_user_profile
    ):
        """A snapshot written by older code must not punch holes in the page."""
        invoice = _make_invoice(
            session, sample_client, issuer_snapshot={"name": "Only A Name"}
        )

        ctx = build_render_context(session, invoice)

        assert ctx["issuer"]["name"] == "Only A Name"
        assert ctx["issuer"]["email"] == "john@example.com"
        assert ctx["issuer"]["city"] == "Sample City"

    def test_context_always_exposes_every_field(
        self, session, sample_client, sample_user_profile
    ):
        """The template's contract: no KeyError, whatever the snapshot holds."""
        invoice = _make_invoice(session, sample_client, issuer_snapshot={})

        ctx = build_render_context(session, invoice)

        for field in (
            "name",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "zip_code",
            "phone",
            "email",
            "payment_instructions",
        ):
            assert field in ctx["issuer"]
        for field in (
            "name",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "zip_code",
            "phone",
        ):
            assert field in ctx["bill_to"]

    def test_service_description_prefers_the_invoice_column(
        self, session, sample_client, sample_user_profile
    ):
        invoice = _make_invoice(
            session, sample_client, service_description="Frozen at create"
        )

        ctx = build_render_context(session, invoice)

        assert ctx["service_description"] == "Frozen at create"

    def test_service_description_falls_back_for_legacy_rows(
        self, session, sample_client, sample_user_profile
    ):
        invoice = _make_invoice(session, sample_client, service_description=None)

        ctx = build_render_context(session, invoice)

        assert ctx["service_description"] == "Software development services"

    def test_missing_profile_and_no_snapshot_is_an_error(self, session, sample_client):
        invoice = _make_invoice(session, sample_client)

        with pytest.raises(ValueError, match="User profile not configured"):
            build_render_context(session, invoice)

    def test_snapshot_renders_without_a_profile_at_all(self, session, sample_client):
        """A snapshotted invoice is self-contained."""
        invoice = _make_invoice(
            session, sample_client, issuer_snapshot=dict(FROZEN_ISSUER)
        )

        ctx = build_render_context(session, invoice)

        assert ctx["issuer"]["name"] == "Frozen Issuer"


class TestRenderInvoiceHtml:
    """The template renders what the resolver decided, with no branching."""

    def test_html_uses_the_snapshot(self, session, sample_client, sample_user_profile):
        invoice = _make_invoice(
            session,
            sample_client,
            issuer_snapshot=FROZEN_ISSUER,
            bill_to_snapshot=FROZEN_BILL_TO,
        )

        html = render_invoice_html(session, invoice)

        assert "Frozen Issuer" in html
        assert "1 Snapshot Way" in html
        assert "Pay the frozen issuer" in html
        assert "Frozen Client" in html
        assert "John Doe" not in html
        assert "Test Company" not in html

    def test_html_falls_back_to_live(self, session, sample_client, sample_user_profile):
        invoice = _make_invoice(session, sample_client)

        html = render_invoice_html(session, invoice)

        assert "John Doe" in html
        assert "Test Company" in html

    def test_html_keeps_the_money_from_the_invoice(
        self, session, sample_client, sample_user_profile
    ):
        """Letterhead is presentation; the figures come from the invoice."""
        invoice = _make_invoice(
            session,
            sample_client,
            issuer_snapshot=FROZEN_ISSUER,
            hourly_rate=Decimal("125.00"),
        )

        html = render_invoice_html(session, invoice)

        assert "$125.00" in html
        assert "Frozen Issuer" in html


class TestCaptureAtFinalize:
    """Snapshots are taken when the invoice is issued, not before."""

    def test_draft_has_no_snapshot(
        self, session, sample_client, sample_user_profile, completed_entry
    ):
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        session.commit()

        assert invoice.issuer_snapshot is None
        assert invoice.bill_to_snapshot is None

    def test_finalize_captures_both_snapshots(
        self, session, sample_client, sample_user_profile, completed_entry
    ):
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        invoice_service.finalize_invoice(session, invoice)
        session.commit()

        assert invoice.issuer_snapshot["name"] == "John Doe"
        assert invoice.issuer_snapshot["email"] == "john@example.com"
        assert invoice.bill_to_snapshot["name"] == "Test Company"
        assert invoice.bill_to_snapshot["zip_code"] == "12345"

    def test_finalized_invoice_ignores_later_profile_edits(
        self, session, sample_client, sample_user_profile, completed_entry
    ):
        """The end-to-end version of the bug this feature fixes."""
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        invoice_service.finalize_invoice(session, invoice)
        session.commit()

        sample_user_profile.name = "Changed After Issue"
        sample_client.name = "Renamed Client"
        session.commit()

        html = render_invoice_html(session, invoice)
        assert "John Doe" in html
        assert "Test Company" in html
        assert "Changed After Issue" not in html
        assert "Renamed Client" not in html

    def test_service_description_frozen_at_create(
        self, session, sample_client, sample_user_profile, completed_entry
    ):
        """Content freezes at create, following hourly_rate."""
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        session.commit()
        assert invoice.service_description == "Software development services"

        sample_client.service_description = "Something else entirely"
        session.commit()

        ctx = build_render_context(session, invoice)
        assert ctx["service_description"] == "Software development services"


class TestRefreshLetterhead:
    """Refresh is an amendment: deliberate, stamped, and never about money."""

    def _finalized(self, session, sample_client):
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        invoice_service.finalize_invoice(session, invoice)
        session.commit()
        return invoice

    def test_refresh_recaptures_and_stamps(
        self, session, sample_client, sample_user_profile, completed_entry
    ):
        invoice = self._finalized(session, sample_client)
        assert invoice.letterhead_refreshed_at is None

        sample_user_profile.name = "Corrected Name"
        session.commit()

        invoice_service.refresh_letterhead(session, invoice)
        session.commit()

        assert invoice.issuer_snapshot["name"] == "Corrected Name"
        assert invoice.letterhead_refreshed_at is not None

    def test_refresh_never_touches_money(
        self, session, sample_client, sample_user_profile, completed_entry
    ):
        """The invariant that makes this safe to expose as a button."""
        invoice = self._finalized(session, sample_client)
        before = (
            invoice.hourly_rate,
            invoice.subtotal,
            invoice.total,
            invoice.tax_rate,
            invoice.other_charges,
            [(li.hours, li.amount) for li in invoice.line_items],
        )

        # Re-rating the client must not follow through to an issued invoice.
        sample_client.hourly_rate = Decimal("999.00")
        session.commit()

        invoice_service.refresh_letterhead(session, invoice)
        session.commit()

        assert (
            invoice.hourly_rate,
            invoice.subtotal,
            invoice.total,
            invoice.tax_rate,
            invoice.other_charges,
            [(li.hours, li.amount) for li in invoice.line_items],
        ) == before

    def test_refresh_leaves_service_description_alone(
        self, session, sample_client, sample_user_profile, completed_entry
    ):
        """It is content, not letterhead -- refresh must not drag it along."""
        invoice = self._finalized(session, sample_client)

        sample_client.service_description = "Rewritten later"
        session.commit()

        invoice_service.refresh_letterhead(session, invoice)
        session.commit()

        assert invoice.service_description == "Software development services"

    def test_refresh_rejects_a_draft(
        self, session, sample_client, sample_user_profile, completed_entry
    ):
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        session.commit()

        with pytest.raises(ValueError, match="finalized"):
            invoice_service.refresh_letterhead(session, invoice)


class TestLetterheadEndpoints:
    """POST /invoices/:id/pdf/regenerate and /refresh-letterhead."""

    def _finalize(self, session, sample_client, monkeypatch, tmp_path):
        monkeypatch.setattr(
            "app.routes.invoices.generate_invoice_pdf",
            lambda s, inv: str(tmp_path / f"invoice_{inv.invoice_number}.pdf"),
        )
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        invoice_service.finalize_invoice(session, invoice)
        session.commit()
        return invoice

    def test_regenerate_returns_the_invoice(
        self,
        client,
        session,
        sample_client,
        sample_user_profile,
        completed_entry,
        monkeypatch,
        tmp_path,
    ):
        invoice = self._finalize(session, sample_client, monkeypatch, tmp_path)

        response = client.post(f"/api/invoices/{invoice.id}/pdf/regenerate")

        assert response.status_code == 200
        assert response.get_json()["id"] == str(invoice.id)

    def test_regenerate_does_not_change_the_document(
        self,
        client,
        session,
        sample_client,
        sample_user_profile,
        completed_entry,
        monkeypatch,
        tmp_path,
    ):
        """A cache rebuild must be idempotent, even after a profile edit."""
        invoice = self._finalize(session, sample_client, monkeypatch, tmp_path)
        before = dict(invoice.issuer_snapshot)

        sample_user_profile.name = "Edited Since"
        session.commit()

        client.post(f"/api/invoices/{invoice.id}/pdf/regenerate")

        after = session.get(Invoice, invoice.id)
        assert after.issuer_snapshot == before
        assert after.letterhead_refreshed_at is None

    def test_regenerate_rejects_a_draft(
        self, client, session, sample_client, sample_user_profile, completed_entry
    ):
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        session.commit()

        response = client.post(f"/api/invoices/{invoice.id}/pdf/regenerate")

        assert response.status_code == 400

    def test_refresh_updates_the_document_and_stamps(
        self,
        client,
        session,
        sample_client,
        sample_user_profile,
        completed_entry,
        monkeypatch,
        tmp_path,
    ):
        invoice = self._finalize(session, sample_client, monkeypatch, tmp_path)

        sample_user_profile.name = "Corrected Name"
        session.commit()

        response = client.post(f"/api/invoices/{invoice.id}/refresh-letterhead")

        assert response.status_code == 200
        assert response.get_json()["letterhead_refreshed_at"] is not None
        after = session.get(Invoice, invoice.id)
        assert after.issuer_snapshot["name"] == "Corrected Name"

    def test_refresh_rejects_a_draft(
        self, client, session, sample_client, sample_user_profile, completed_entry
    ):
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        session.commit()

        response = client.post(f"/api/invoices/{invoice.id}/refresh-letterhead")

        assert response.status_code == 400

    def test_unknown_invoice_is_404(self, client, session):
        missing = "00000000-0000-0000-0000-000000000009"
        assert client.post(f"/api/invoices/{missing}/pdf/regenerate").status_code == 404
        assert (
            client.post(f"/api/invoices/{missing}/refresh-letterhead").status_code
            == 404
        )

    def test_download_regenerates_when_the_file_is_missing(
        self,
        client,
        session,
        sample_client,
        sample_user_profile,
        completed_entry,
        monkeypatch,
        tmp_path,
    ):
        """A stored path pointing at nothing should heal, not 500."""
        invoice = self._finalize(session, sample_client, monkeypatch, tmp_path)
        invoice.pdf_path = str(tmp_path / "gone.pdf")
        session.commit()

        real = tmp_path / "regenerated.pdf"
        real.write_bytes(b"%PDF-1.7\nregenerated")
        monkeypatch.setattr(
            "app.routes.invoices.generate_invoice_pdf", lambda s, inv: str(real)
        )

        response = client.get(f"/api/invoices/{invoice.id}/pdf")

        assert response.status_code == 200
        after = session.get(Invoice, invoice.id)
        assert after.pdf_path == str(real)
