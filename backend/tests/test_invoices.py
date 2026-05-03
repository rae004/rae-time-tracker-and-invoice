"""Tests for invoices API endpoints and service layer."""

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest

from app.models import Project, TimeEntry
from app.models.invoice import InvoiceStatus
from app.services import invoice_service


@pytest.fixture
def completed_entry(session, sample_project):
    """A completed 1-hour time entry on 2026-04-15."""
    start = datetime(2026, 4, 15, 14, 0, 0, tzinfo=UTC)
    entry = TimeEntry(
        project_id=sample_project.id,
        name="Test work",
        start_time=start,
        end_time=start + timedelta(hours=1),
        duration_ms=3_600_000,
    )
    session.add(entry)
    session.commit()
    return entry


@pytest.fixture
def running_entry(session, sample_project):
    """A running (no end_time) time entry — should be excluded from invoices."""
    entry = TimeEntry(
        project_id=sample_project.id,
        name="Still working",
        start_time=datetime(2026, 4, 15, 16, 0, 0, tzinfo=UTC),
        end_time=None,
        duration_ms=None,
    )
    session.add(entry)
    session.commit()
    return entry


class TestListInvoices:
    """GET /api/invoices."""

    def test_list_empty(self, client, session):
        response = client.get("/api/invoices")
        assert response.status_code == 200
        data = response.get_json()
        assert data["invoices"] == []
        assert data["total"] == 0

    def test_list_with_data(
        self, client, session, sample_client, sample_user_profile, completed_entry
    ):
        invoice = invoice_service.create_invoice_from_entries(
            session,
            sample_client.id,
            date(2026, 4, 1),
            date(2026, 4, 27),
        )
        session.commit()

        response = client.get("/api/invoices")
        assert response.status_code == 200
        data = response.get_json()
        assert data["total"] == 1
        assert data["invoices"][0]["id"] == str(invoice.id)
        assert data["invoices"][0]["client_name"] == sample_client.name

    def test_list_filtered_by_client(
        self, client, session, sample_client, sample_user_profile, completed_entry
    ):
        invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        session.commit()

        response = client.get(f"/api/invoices?client_id={sample_client.id}")
        assert response.status_code == 200
        assert response.get_json()["total"] == 1

        other_client_id = "00000000-0000-0000-0000-000000000001"
        response = client.get(f"/api/invoices?client_id={other_client_id}")
        assert response.get_json()["total"] == 0

    def test_list_filtered_by_status(
        self, client, session, sample_client, sample_user_profile, completed_entry
    ):
        invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        session.commit()

        response = client.get("/api/invoices?status=draft")
        assert response.get_json()["total"] == 1

        response = client.get("/api/invoices?status=finalized")
        assert response.get_json()["total"] == 0


class TestPreviewInvoice:
    """POST /api/invoices/preview."""

    def test_preview_with_entries(
        self, client, session, sample_client, completed_entry
    ):
        payload = {
            "client_id": str(sample_client.id),
            "period_start": "2026-04-01",
            "period_end": "2026-04-27",
        }
        response = client.post("/api/invoices/preview", json=payload)

        assert response.status_code == 200
        data = response.get_json()
        assert data["client_id"] == str(sample_client.id)
        assert data["client_name"] == sample_client.name
        assert len(data["line_items"]) == 1
        assert Decimal(data["line_items"][0]["hours"]) == Decimal("1.0000")
        assert data["line_items"][0]["time_entry_name"] == "Test work"
        assert "source_entry_ids" in data["line_items"][0]
        assert len(data["line_items"][0]["source_entry_ids"]) == 1
        assert Decimal(data["subtotal"]) == Decimal("150.00")  # 1hr * $150
        assert Decimal(data["total"]) == Decimal("150.00")

    def test_preview_no_entries(self, client, session, sample_client):
        payload = {
            "client_id": str(sample_client.id),
            "period_start": "2026-04-01",
            "period_end": "2026-04-27",
        }
        response = client.post("/api/invoices/preview", json=payload)

        assert response.status_code == 200
        data = response.get_json()
        assert data["line_items"] == []
        assert Decimal(data["subtotal"]) == Decimal("0")

    def test_preview_excludes_running_entries(
        self, client, session, sample_client, completed_entry, running_entry
    ):
        payload = {
            "client_id": str(sample_client.id),
            "period_start": "2026-04-01",
            "period_end": "2026-04-27",
        }
        response = client.post("/api/invoices/preview", json=payload)

        assert len(response.get_json()["line_items"]) == 1

    def test_preview_excludes_specified_entries(
        self, client, session, sample_client, completed_entry
    ):
        payload = {
            "client_id": str(sample_client.id),
            "period_start": "2026-04-01",
            "period_end": "2026-04-27",
            "exclude_entry_ids": [str(completed_entry.id)],
        }
        response = client.post("/api/invoices/preview", json=payload)

        assert response.get_json()["line_items"] == []

    def test_preview_unknown_client(self, client, session):
        payload = {
            "client_id": "00000000-0000-0000-0000-000000000001",
            "period_start": "2026-04-01",
            "period_end": "2026-04-27",
        }
        response = client.post("/api/invoices/preview", json=payload)

        assert response.status_code == 400
        assert "Client not found" in response.get_json()["error"]

    def test_preview_validation_error(self, client, session):
        response = client.post("/api/invoices/preview", json={})

        assert response.status_code == 400
        assert "error" in response.get_json()


class TestCreateInvoice:
    """POST /api/invoices."""

    def test_create_from_entries(
        self,
        client,
        session,
        sample_client,
        sample_user_profile,
        completed_entry,
    ):
        payload = {
            "client_id": str(sample_client.id),
            "period_start": "2026-04-01",
            "period_end": "2026-04-27",
            "hourly_rate": "150.00",
        }
        response = client.post("/api/invoices", json=payload)

        assert response.status_code == 201
        data = response.get_json()
        assert data["status"] == "draft"
        assert len(data["line_items"]) == 1
        assert data["line_items"][0]["time_entry_name"] == "Test work"
        assert Decimal(data["total"]) == Decimal("150.00")

    def test_create_with_explicit_line_items(
        self,
        client,
        session,
        sample_client,
        sample_user_profile,
    ):
        payload = {
            "client_id": str(sample_client.id),
            "period_start": "2026-04-01",
            "period_end": "2026-04-27",
            "hourly_rate": "100.00",
            "line_items": [
                {
                    "project_name": "Manual entry",
                    "work_date": "2026-04-10",
                    "hours": "2.5",
                    "amount": "250.00",
                    "sort_order": 0,
                }
            ],
        }
        response = client.post("/api/invoices", json=payload)

        assert response.status_code == 201
        data = response.get_json()
        assert len(data["line_items"]) == 1
        assert Decimal(data["line_items"][0]["amount"]) == Decimal("250.00")
        assert Decimal(data["total"]) == Decimal("250.00")

    def test_create_with_tax_and_other_charges(
        self,
        client,
        session,
        sample_client,
        sample_user_profile,
        completed_entry,
    ):
        payload = {
            "client_id": str(sample_client.id),
            "period_start": "2026-04-01",
            "period_end": "2026-04-27",
            "hourly_rate": "150.00",
            "tax_rate": "0.10",
            "other_charges": "25.00",
        }
        response = client.post("/api/invoices", json=payload)

        assert response.status_code == 201
        data = response.get_json()
        # subtotal 150 + tax 15 + other 25 = 190
        assert Decimal(data["subtotal"]) == Decimal("150.00")
        assert Decimal(data["total"]) == Decimal("190.00")

    def test_create_no_entries_fails(
        self, client, session, sample_client, sample_user_profile
    ):
        payload = {
            "client_id": str(sample_client.id),
            "period_start": "2026-04-01",
            "period_end": "2026-04-27",
            "hourly_rate": "150.00",
        }
        response = client.post("/api/invoices", json=payload)

        assert response.status_code == 400
        assert "No time entries" in response.get_json()["error"]

    def test_create_validation_error(self, client, session):
        response = client.post("/api/invoices", json={})

        assert response.status_code == 400
        assert "error" in response.get_json()

    def test_create_without_user_profile(
        self, client, session, sample_client, completed_entry
    ):
        # No sample_user_profile fixture — invoice numbering depends on it
        payload = {
            "client_id": str(sample_client.id),
            "period_start": "2026-04-01",
            "period_end": "2026-04-27",
            "hourly_rate": "150.00",
        }
        response = client.post("/api/invoices", json=payload)

        assert response.status_code == 400
        assert "User profile" in response.get_json()["error"]


class TestGetInvoice:
    """GET /api/invoices/:id."""

    def test_get_existing(
        self, client, session, sample_client, sample_user_profile, completed_entry
    ):
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        session.commit()

        response = client.get(f"/api/invoices/{invoice.id}")
        assert response.status_code == 200
        data = response.get_json()
        assert data["id"] == str(invoice.id)
        assert len(data["line_items"]) == 1

    def test_get_not_found(self, client, session):
        response = client.get("/api/invoices/00000000-0000-0000-0000-000000000001")
        assert response.status_code == 404
        assert response.get_json()["error"] == "Invoice not found"


class TestUpdateInvoice:
    """PUT /api/invoices/:id."""

    def test_update_draft(
        self, client, session, sample_client, sample_user_profile, completed_entry
    ):
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        session.commit()

        response = client.put(
            f"/api/invoices/{invoice.id}",
            json={"hourly_rate": "200.00", "tax_rate": "0.05"},
        )
        assert response.status_code == 200
        data = response.get_json()
        assert Decimal(data["hourly_rate"]) == Decimal("200.00")
        assert Decimal(data["tax_rate"]) == Decimal("0.05")

    def test_update_finalized_rejected(
        self, client, session, sample_client, sample_user_profile, completed_entry
    ):
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        invoice_service.finalize_invoice(session, invoice)
        session.commit()

        response = client.put(
            f"/api/invoices/{invoice.id}", json={"hourly_rate": "200.00"}
        )
        assert response.status_code == 400
        assert "finalized" in response.get_json()["error"].lower()

    def test_update_not_found(self, client, session):
        response = client.put(
            "/api/invoices/00000000-0000-0000-0000-000000000001",
            json={"hourly_rate": "200.00"},
        )
        assert response.status_code == 404

    def test_update_validation_error(
        self, client, session, sample_client, sample_user_profile, completed_entry
    ):
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        session.commit()

        response = client.put(f"/api/invoices/{invoice.id}", json={"hourly_rate": "-1"})
        assert response.status_code == 400


class TestDeleteInvoice:
    """DELETE /api/invoices/:id."""

    def test_delete_draft(
        self, client, session, sample_client, sample_user_profile, completed_entry
    ):
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        session.commit()

        response = client.delete(f"/api/invoices/{invoice.id}")
        assert response.status_code == 200

        response = client.get(f"/api/invoices/{invoice.id}")
        assert response.status_code == 404

    def test_delete_finalized_rejected(
        self, client, session, sample_client, sample_user_profile, completed_entry
    ):
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        invoice_service.finalize_invoice(session, invoice)
        session.commit()

        response = client.delete(f"/api/invoices/{invoice.id}")
        assert response.status_code == 400
        assert "finalized" in response.get_json()["error"].lower()

    def test_delete_not_found(self, client, session):
        response = client.delete("/api/invoices/00000000-0000-0000-0000-000000000001")
        assert response.status_code == 404


class TestFinalizeInvoice:
    """POST /api/invoices/:id/finalize.

    PDF generation is monkeypatched away — WeasyPrint requires native libs
    that aren't available in unit-test environments.
    """

    def test_finalize_draft(
        self,
        client,
        session,
        sample_client,
        sample_user_profile,
        completed_entry,
        monkeypatch,
        tmp_path,
    ):
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        session.commit()

        monkeypatch.setattr(
            "app.routes.invoices.generate_invoice_pdf",
            lambda _session, inv: str(tmp_path / f"invoice_{inv.invoice_number}.pdf"),
        )

        response = client.post(f"/api/invoices/{invoice.id}/finalize")
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == InvoiceStatus.FINALIZED.value
        assert data["pdf_path"] is not None

    def test_finalize_already_finalized(
        self,
        client,
        session,
        sample_client,
        sample_user_profile,
        completed_entry,
        monkeypatch,
        tmp_path,
    ):
        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        invoice_service.finalize_invoice(session, invoice)
        session.commit()

        monkeypatch.setattr(
            "app.routes.invoices.generate_invoice_pdf",
            lambda _s, inv: str(tmp_path / "x.pdf"),
        )

        response = client.post(f"/api/invoices/{invoice.id}/finalize")
        assert response.status_code == 400
        assert "already finalized" in response.get_json()["error"].lower()

    def test_finalize_not_found(self, client, session):
        response = client.post(
            "/api/invoices/00000000-0000-0000-0000-000000000001/finalize"
        )
        assert response.status_code == 404


class TestInvoiceServiceUnits:
    """Direct unit tests for invoice_service helpers."""

    def test_calculate_invoice_totals_no_tax(self):
        items = [{"amount": Decimal("100.00")}, {"amount": Decimal("50.00")}]
        subtotal, total = invoice_service.calculate_invoice_totals(items)
        assert subtotal == Decimal("150.00")
        assert total == Decimal("150.00")

    def test_calculate_invoice_totals_with_tax_and_other(self):
        items = [{"amount": Decimal("100.00")}]
        subtotal, total = invoice_service.calculate_invoice_totals(
            items,
            tax_rate=Decimal("0.10"),
            other_charges=Decimal("5.00"),
        )
        assert subtotal == Decimal("100.00")
        assert total == Decimal("115.00")

    def test_create_line_items_quantizes_hours(self, session, sample_project):
        # 90 minutes = 5_400_000 ms = 1.5 hours exactly
        entry = TimeEntry(
            project_id=sample_project.id,
            name="x",
            start_time=datetime(2026, 4, 15, 14, 0, 0, tzinfo=UTC),
            end_time=datetime(2026, 4, 15, 15, 30, 0, tzinfo=UTC),
            duration_ms=5_400_000,
        )
        entry.project = sample_project
        items = invoice_service.create_line_items_from_entries(
            [entry], Decimal("100.00")
        )
        assert items[0]["hours"] == Decimal("1.5000")
        assert items[0]["amount"] == Decimal("150.0000")
        assert items[0]["time_entry_name"] == "x"
        assert items[0]["source_entry_ids"] == [entry.id]
        assert items[0]["time_entry_id"] == entry.id

    def test_create_line_items_preserves_empty_entry_name(
        self, session, sample_project
    ):
        entry = TimeEntry(
            project_id=sample_project.id,
            name="",
            start_time=datetime(2026, 4, 15, 14, 0, 0, tzinfo=UTC),
            end_time=datetime(2026, 4, 15, 15, 0, 0, tzinfo=UTC),
            duration_ms=3_600_000,
        )
        entry.project = sample_project
        items = invoice_service.create_line_items_from_entries(
            [entry], Decimal("100.00")
        )
        assert items[0]["time_entry_name"] == ""
        assert items[0]["source_entry_ids"] == [entry.id]

    def test_create_line_items_combines_same_day_same_name(
        self, session, sample_project
    ):
        """Two entries with same project, name, and date combine into one item."""
        entry_a = TimeEntry(
            project_id=sample_project.id,
            name="Refactor auth",
            start_time=datetime(2026, 4, 15, 9, 0, 0, tzinfo=UTC),
            end_time=datetime(2026, 4, 15, 10, 0, 0, tzinfo=UTC),
            duration_ms=3_600_000,
        )
        entry_b = TimeEntry(
            project_id=sample_project.id,
            name="Refactor auth",
            start_time=datetime(2026, 4, 15, 14, 0, 0, tzinfo=UTC),
            end_time=datetime(2026, 4, 15, 14, 30, 0, tzinfo=UTC),
            duration_ms=1_800_000,
        )
        entry_c = TimeEntry(
            project_id=sample_project.id,
            name="Write tests",
            start_time=datetime(2026, 4, 15, 16, 0, 0, tzinfo=UTC),
            end_time=datetime(2026, 4, 15, 17, 0, 0, tzinfo=UTC),
            duration_ms=3_600_000,
        )
        for e in (entry_a, entry_b, entry_c):
            e.project = sample_project
        items = invoice_service.create_line_items_from_entries(
            [entry_a, entry_b, entry_c], Decimal("100.00")
        )
        assert len(items) == 2
        combined = next(i for i in items if i["time_entry_name"] == "Refactor auth")
        singleton = next(i for i in items if i["time_entry_name"] == "Write tests")

        assert combined["hours"] == Decimal("1.5000")
        assert combined["amount"] == Decimal("150.0000")
        assert combined["time_entry_id"] is None
        assert set(combined["source_entry_ids"]) == {entry_a.id, entry_b.id}
        assert len(combined["source_entry_ids"]) == 2

        assert singleton["time_entry_id"] == entry_c.id
        assert singleton["source_entry_ids"] == [entry_c.id]

    def test_create_line_items_different_projects_not_combined(
        self, session, sample_client, sample_project
    ):
        """Same name + date but different projects must remain separate."""
        other_project = Project(
            client_id=sample_client.id,
            name="Other Project",
            is_active=True,
        )
        session.add(other_project)
        session.commit()

        entry_a = TimeEntry(
            project_id=sample_project.id,
            name="Same name",
            start_time=datetime(2026, 4, 15, 9, 0, 0, tzinfo=UTC),
            end_time=datetime(2026, 4, 15, 10, 0, 0, tzinfo=UTC),
            duration_ms=3_600_000,
        )
        entry_b = TimeEntry(
            project_id=other_project.id,
            name="Same name",
            start_time=datetime(2026, 4, 15, 14, 0, 0, tzinfo=UTC),
            end_time=datetime(2026, 4, 15, 15, 0, 0, tzinfo=UTC),
            duration_ms=3_600_000,
        )
        entry_a.project = sample_project
        entry_b.project = other_project
        items = invoice_service.create_line_items_from_entries(
            [entry_a, entry_b], Decimal("100.00")
        )
        assert len(items) == 2

    def test_create_line_items_different_dates_not_combined(
        self, session, sample_project
    ):
        """Same project + name but different dates must remain separate."""
        entry_a = TimeEntry(
            project_id=sample_project.id,
            name="Same task",
            start_time=datetime(2026, 4, 15, 14, 0, 0, tzinfo=UTC),
            end_time=datetime(2026, 4, 15, 15, 0, 0, tzinfo=UTC),
            duration_ms=3_600_000,
        )
        entry_b = TimeEntry(
            project_id=sample_project.id,
            name="Same task",
            start_time=datetime(2026, 4, 16, 14, 0, 0, tzinfo=UTC),
            end_time=datetime(2026, 4, 16, 15, 0, 0, tzinfo=UTC),
            duration_ms=3_600_000,
        )
        entry_a.project = sample_project
        entry_b.project = sample_project
        items = invoice_service.create_line_items_from_entries(
            [entry_a, entry_b], Decimal("100.00")
        )
        assert len(items) == 2

    def test_create_line_items_empty_name_combines_within_day(
        self, session, sample_project
    ):
        """Two empty-named entries on the same project/date combine."""
        entry_a = TimeEntry(
            project_id=sample_project.id,
            name="",
            start_time=datetime(2026, 4, 15, 9, 0, 0, tzinfo=UTC),
            end_time=datetime(2026, 4, 15, 10, 0, 0, tzinfo=UTC),
            duration_ms=3_600_000,
        )
        entry_b = TimeEntry(
            project_id=sample_project.id,
            name="",
            start_time=datetime(2026, 4, 15, 14, 0, 0, tzinfo=UTC),
            end_time=datetime(2026, 4, 15, 15, 0, 0, tzinfo=UTC),
            duration_ms=3_600_000,
        )
        entry_a.project = sample_project
        entry_b.project = sample_project
        items = invoice_service.create_line_items_from_entries(
            [entry_a, entry_b], Decimal("100.00")
        )
        assert len(items) == 1
        assert items[0]["hours"] == Decimal("2.0000")
        assert items[0]["time_entry_id"] is None
        assert len(items[0]["source_entry_ids"]) == 2
