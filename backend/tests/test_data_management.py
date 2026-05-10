"""Tests for /api/data export, import, and reset endpoints."""

from datetime import UTC, date, datetime
from decimal import Decimal

import pytest

from app.models import (
    CategoryTag,
    Client,
    Invoice,
    InvoiceLineItem,
    Project,
    TimeEntry,
    UserProfile,
)
from app.routes.data_management import (
    RESET_CONFIRM_HEADER,
    RESET_CONFIRM_VALUE,
)


@pytest.fixture
def seeded(
    session, sample_user_profile, sample_client, sample_project, sample_category_tag
):
    """Seed a full snapshot: profile + client + project + tag + entry + invoice."""
    entry = TimeEntry(
        project_id=sample_project.id,
        name="Build feature",
        start_time=datetime(2026, 4, 15, 14, 0, 0, tzinfo=UTC),
        end_time=datetime(2026, 4, 15, 15, 0, 0, tzinfo=UTC),
        duration_ms=3_600_000,
    )
    entry.tags.append(sample_category_tag)
    session.add(entry)

    invoice = Invoice(
        invoice_number=1001,
        client_id=sample_client.id,
        period_start=date(2026, 4, 1),
        period_end=date(2026, 4, 30),
        hourly_rate=Decimal("150.00"),
        subtotal=Decimal("150.00"),
        tax_rate=Decimal("0.00"),
        other_charges=Decimal("0.00"),
        total=Decimal("150.00"),
        status="draft",
    )
    invoice.line_items.append(
        InvoiceLineItem(
            project_name=sample_project.name,
            time_entry_name=entry.name,
            work_date=date(2026, 4, 15),
            hours=Decimal("1.0000"),
            amount=Decimal("150.00"),
            sort_order=0,
        )
    )
    session.add(invoice)
    session.commit()
    return {
        "profile": sample_user_profile,
        "client": sample_client,
        "project": sample_project,
        "tag": sample_category_tag,
        "entry": entry,
        "invoice": invoice,
    }


class TestExport:
    """GET /api/data/export."""

    def test_export_empty(self, client, session):
        response = client.get("/api/data/export")
        assert response.status_code == 200
        assert response.mimetype == "application/json"
        assert "attachment" in response.headers.get("Content-Disposition", "")

        data = response.get_json()
        assert data["export_version"] == "1.0"
        assert "export_date" in data
        assert data["data"]["user_profile"] is None
        assert data["data"]["category_tags"] == []
        assert data["data"]["clients"] == []
        assert data["data"]["projects"] == []
        assert data["data"]["time_entries"] == []
        assert data["data"]["invoices"] == []

    def test_export_includes_all_resources(self, client, session, seeded):
        response = client.get("/api/data/export")
        assert response.status_code == 200

        data = response.get_json()["data"]
        assert data["user_profile"]["name"] == "John Doe"
        assert len(data["category_tags"]) == 1
        assert data["category_tags"][0]["name"] == "Development"
        assert len(data["clients"]) == 1
        assert data["clients"][0]["name"] == "Test Company"
        assert len(data["projects"]) == 1
        assert data["projects"][0]["client_name"] == "Test Company"
        assert len(data["time_entries"]) == 1
        assert data["time_entries"][0]["project_name"] == "Test Project"
        assert data["time_entries"][0]["client_name"] == "Test Company"
        assert data["time_entries"][0]["tag_names"] == ["Development"]
        assert len(data["invoices"]) == 1
        assert data["invoices"][0]["invoice_number"] == 1001
        assert data["invoices"][0]["client_name"] == "Test Company"
        assert len(data["invoices"][0]["line_items"]) == 1

    def test_export_filename_has_date(self, client, session):
        response = client.get("/api/data/export")
        cd = response.headers.get("Content-Disposition", "")
        assert "rae-time-tracker-export-" in cd
        assert ".json" in cd


class TestImport:
    """POST /api/data/import."""

    def _export_payload(self, client_):
        return client_.get("/api/data/export").get_json()

    def test_import_into_empty_db_creates_everything(self, client, session, seeded):
        payload = self._export_payload(client)

        # Wipe via reset for a clean slate
        client.delete(
            "/api/data/reset",
            headers={RESET_CONFIRM_HEADER: RESET_CONFIRM_VALUE},
        )
        assert session.query(Client).count() == 0

        response = client.post("/api/data/import", json=payload)
        assert response.status_code == 200
        counts = response.get_json()["counts"]
        assert counts["user_profile_created"] == 1
        assert counts["category_tags_created"] == 1
        assert counts["clients_created"] == 1
        assert counts["projects_created"] == 1
        assert counts["time_entries_created"] == 1
        assert counts["invoices_created"] == 1
        assert counts["invoice_line_items_created"] == 1

        assert session.query(UserProfile).count() == 1
        assert session.query(Client).count() == 1
        assert session.query(Project).count() == 1
        assert session.query(CategoryTag).count() == 1
        assert session.query(TimeEntry).count() == 1
        assert session.query(Invoice).count() == 1
        assert session.query(InvoiceLineItem).count() == 1

    def test_import_skips_duplicates_by_name(self, client, session, seeded):
        payload = self._export_payload(client)
        response = client.post("/api/data/import", json=payload)
        assert response.status_code == 200

        counts = response.get_json()["counts"]
        assert counts["user_profile_skipped"] == 1
        assert counts["category_tags_skipped"] == 1
        assert counts["clients_skipped"] == 1
        assert counts["projects_skipped"] == 1
        assert counts["invoices_skipped"] == 1
        # Time entries always created new (no natural unique key)
        assert counts["time_entries_created"] == 1

        # Originals still single records
        assert session.query(Client).count() == 1
        assert session.query(Project).count() == 1
        assert session.query(CategoryTag).count() == 1
        # Time entries doubled
        assert session.query(TimeEntry).count() == 2

    def test_import_resolves_project_and_tags_by_name(self, client, session, seeded):
        payload = self._export_payload(client)
        client.delete(
            "/api/data/reset",
            headers={RESET_CONFIRM_HEADER: RESET_CONFIRM_VALUE},
        )

        response = client.post("/api/data/import", json=payload)
        assert response.status_code == 200

        entry = session.query(TimeEntry).first()
        assert entry is not None
        assert entry.project is not None
        assert entry.project.name == "Test Project"
        assert [t.name for t in entry.tags] == ["Development"]

    def test_import_rejects_bad_payload(self, client, session):
        response = client.post("/api/data/import", json={"not_an_export": True})
        assert response.status_code == 400

    def test_import_roundtrip_preserves_data(self, client, session, seeded):
        original = self._export_payload(client)
        client.delete(
            "/api/data/reset",
            headers={RESET_CONFIRM_HEADER: RESET_CONFIRM_VALUE},
        )
        client.post("/api/data/import", json=original)

        roundtripped = client.get("/api/data/export").get_json()
        assert roundtripped["data"]["user_profile"] == original["data"]["user_profile"]
        assert (
            roundtripped["data"]["category_tags"] == original["data"]["category_tags"]
        )
        assert roundtripped["data"]["clients"] == original["data"]["clients"]
        assert roundtripped["data"]["projects"] == original["data"]["projects"]

        # Datetimes/dates survive the roundtrip semantically, but SQLite strips
        # tz info on store so we compare structural fields rather than full dicts.
        assert len(roundtripped["data"]["time_entries"]) == 1
        rt_entry = roundtripped["data"]["time_entries"][0]
        orig_entry = original["data"]["time_entries"][0]
        for field in (
            "name",
            "duration_ms",
            "project_name",
            "client_name",
            "tag_names",
        ):
            assert rt_entry[field] == orig_entry[field]

        assert len(roundtripped["data"]["invoices"]) == 1
        rt_inv = roundtripped["data"]["invoices"][0]
        orig_inv = original["data"]["invoices"][0]
        for field in (
            "invoice_number",
            "client_name",
            "hourly_rate",
            "subtotal",
            "total",
            "status",
        ):
            assert rt_inv[field] == orig_inv[field]
        assert len(rt_inv["line_items"]) == len(orig_inv["line_items"])


class TestReset:
    """DELETE /api/data/reset."""

    def test_reset_requires_confirm_header(self, client, session, seeded):
        response = client.delete("/api/data/reset")
        assert response.status_code == 400
        assert session.query(Client).count() == 1

    def test_reset_rejects_wrong_header_value(self, client, session, seeded):
        response = client.delete(
            "/api/data/reset",
            headers={RESET_CONFIRM_HEADER: "wrong"},
        )
        assert response.status_code == 400
        assert session.query(Client).count() == 1

    def test_reset_deletes_everything_with_header(self, client, session, seeded):
        response = client.delete(
            "/api/data/reset",
            headers={RESET_CONFIRM_HEADER: RESET_CONFIRM_VALUE},
        )
        assert response.status_code == 200
        body = response.get_json()
        assert body["success"] is True
        deleted = body["deleted"]
        assert deleted["clients"] == 1
        assert deleted["projects"] == 1
        assert deleted["time_entries"] == 1
        assert deleted["invoices"] == 1
        assert deleted["invoice_line_items"] == 1
        assert deleted["category_tags"] == 1
        assert deleted["user_profiles"] == 1

        assert session.query(Client).count() == 0
        assert session.query(Project).count() == 0
        assert session.query(TimeEntry).count() == 0
        assert session.query(Invoice).count() == 0
        assert session.query(InvoiceLineItem).count() == 0
        assert session.query(CategoryTag).count() == 0
        assert session.query(UserProfile).count() == 0
