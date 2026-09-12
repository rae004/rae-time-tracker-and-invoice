"""Invoice number allocation.

The profile counter is the allocation cursor, but it is not the only way a row
reaches `invoices` -- import_data inserts them with their exported numbers.
Nothing forced the counter past those, so a counter sitting behind an imported
block walks into a duplicate-key violation when it catches up. That is not
hypothetical: an import of invoices 4 and 6-11 against a counter of 1 failed six
weeks later, on the create that allocated 4.
"""

from datetime import date
from decimal import Decimal

from app.models import Invoice
from app.models.invoice import InvoiceStatus
from app.services import invoice_service


def _invoice(session, client, number, **overrides):
    values = {
        "invoice_number": number,
        "client_id": client.id,
        "period_start": date(2026, 4, 1),
        "period_end": date(2026, 4, 14),
        "hourly_rate": Decimal("150.00"),
        "subtotal": Decimal("0.00"),
        "total": Decimal("0.00"),
        "status": InvoiceStatus.FINALIZED.value,
    }
    values.update(overrides)
    invoice = Invoice(**values)
    session.add(invoice)
    session.commit()
    return invoice


class TestResolveNextInvoiceNumber:
    def test_uses_the_counter_when_nothing_is_issued(
        self, session, sample_user_profile
    ):
        sample_user_profile.next_invoice_number = 7
        session.commit()

        assert (
            invoice_service.resolve_next_invoice_number(session, sample_user_profile)
            == 7
        )

    def test_uses_the_counter_when_it_leads(
        self, session, sample_client, sample_user_profile
    ):
        _invoice(session, sample_client, 2)
        sample_user_profile.next_invoice_number = 9
        session.commit()

        assert (
            invoice_service.resolve_next_invoice_number(session, sample_user_profile)
            == 9
        )

    def test_skips_past_numbers_the_counter_does_not_know_about(
        self, session, sample_client, sample_user_profile
    ):
        """The reported bug: counter behind an imported block."""
        for number in (4, 6, 7, 8, 9, 10, 11):
            _invoice(session, sample_client, number)
        sample_user_profile.next_invoice_number = 4
        session.commit()

        assert (
            invoice_service.resolve_next_invoice_number(session, sample_user_profile)
            == 12
        )


class TestAllocateInvoiceNumber:
    def test_advances_the_cursor_past_what_it_returned(
        self, session, sample_client, sample_user_profile
    ):
        for number in (4, 6, 7, 8, 9, 10, 11):
            _invoice(session, sample_client, number)
        sample_user_profile.next_invoice_number = 4
        session.commit()

        assert (
            invoice_service.allocate_invoice_number(session, sample_user_profile) == 12
        )
        assert sample_user_profile.next_invoice_number == 13

    def test_create_invoice_does_not_collide_with_an_imported_block(
        self, session, sample_client, sample_user_profile, completed_entry
    ):
        """End to end: the create that used to 500 with a UniqueViolation."""
        for number in (4, 6, 7, 8, 9, 10, 11):
            _invoice(session, sample_client, number)
        sample_user_profile.next_invoice_number = 4
        session.commit()

        invoice = invoice_service.create_invoice_from_entries(
            session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
        )
        session.commit()

        assert invoice.invoice_number == 12
        assert sample_user_profile.next_invoice_number == 13

    def test_consecutive_creates_do_not_reuse_a_number(
        self, session, sample_client, sample_user_profile, completed_entry
    ):
        numbers = []
        for _ in range(3):
            invoice = invoice_service.create_invoice_from_entries(
                session, sample_client.id, date(2026, 4, 1), date(2026, 4, 27)
            )
            session.commit()
            numbers.append(invoice.invoice_number)

        assert len(set(numbers)) == 3
        assert numbers == sorted(numbers)

    def test_a_gap_below_the_highest_is_not_reused(
        self, session, sample_client, sample_user_profile
    ):
        """5 is missing from the imported block; allocation must not backfill it."""
        for number in (4, 6, 7):
            _invoice(session, sample_client, number)
        sample_user_profile.next_invoice_number = 1
        session.commit()

        assert (
            invoice_service.allocate_invoice_number(session, sample_user_profile) == 8
        )


class TestProfileReportsResolvedNumber:
    def test_api_reports_the_number_the_next_invoice_will_take(
        self, client, session, sample_client, sample_user_profile
    ):
        """Settings must not advertise a number that is already taken."""
        for number in (4, 6, 7, 8, 9, 10, 11):
            _invoice(session, sample_client, number)
        sample_user_profile.next_invoice_number = 4
        session.commit()

        response = client.get("/api/user-profile")

        assert response.status_code == 200
        assert response.get_json()["next_invoice_number"] == 12


class TestImportAdvancesTheCursor:
    """Import is where the cursor gets left behind in the first place."""

    def test_import_moves_the_cursor_past_imported_numbers(
        self, session, sample_client, sample_user_profile
    ):
        from app.schemas.data_management import DataImport
        from app.services import data_management_service

        sample_user_profile.next_invoice_number = 1
        session.commit()

        payload = DataImport.model_validate(
            {
                "export_version": "1",
                "data": {
                    "user_profile": None,
                    "category_tags": [],
                    "clients": [],
                    "projects": [],
                    "time_entries": [],
                    "invoices": [
                        {
                            "invoice_number": number,
                            "client_name": sample_client.name,
                            "period_start": "2026-04-01",
                            "period_end": "2026-04-14",
                            "hourly_rate": "150.00",
                            "subtotal": "0.00",
                            "tax_rate": "0.00",
                            "other_charges": "0.00",
                            "total": "0.00",
                            "status": "finalized",
                            "line_items": [],
                        }
                        for number in (4, 6, 7, 8, 9, 10, 11)
                    ],
                },
            }
        )

        data_management_service.apply_import(session, payload)

        assert sample_user_profile.next_invoice_number == 12

    def test_import_leaves_a_leading_cursor_alone(
        self, session, sample_client, sample_user_profile
    ):
        from app.schemas.data_management import DataImport
        from app.services import data_management_service

        sample_user_profile.next_invoice_number = 500
        session.commit()

        payload = DataImport.model_validate(
            {
                "export_version": "1",
                "data": {
                    "user_profile": None,
                    "category_tags": [],
                    "clients": [],
                    "projects": [],
                    "time_entries": [],
                    "invoices": [
                        {
                            "invoice_number": 4,
                            "client_name": sample_client.name,
                            "period_start": "2026-04-01",
                            "period_end": "2026-04-14",
                            "hourly_rate": "150.00",
                            "subtotal": "0.00",
                            "tax_rate": "0.00",
                            "other_charges": "0.00",
                            "total": "0.00",
                            "status": "finalized",
                            "line_items": [],
                        }
                    ],
                },
            }
        )

        data_management_service.apply_import(session, payload)

        assert sample_user_profile.next_invoice_number == 500
