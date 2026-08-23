"""Tests that need the real database engine.

The rest of the suite runs on in-memory SQLite, which is fast and needs no
database. What it cannot do is tell you whether the schema is actually valid on
Postgres, or whether a migration applies -- `Base.metadata.create_all` never
invokes Alembic. Both blind spots are covered here.

Skips when no test database is reachable, so `pytest` on a laptop with nothing
running behaves exactly as before. CI has a Postgres service, so these run there.
"""

from datetime import date
from decimal import Decimal

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text

from app.models import Invoice
from app.models.invoice import InvoiceStatus

pytestmark = pytest.mark.postgres

LETTERHEAD_COLUMNS = {
    "issuer_snapshot",
    "bill_to_snapshot",
    "service_description",
    "letterhead_refreshed_at",
}


@pytest.fixture
def alembic_config(postgres_url, monkeypatch):
    """An Alembic config pointed at the test database.

    migrations/env.py resolves its URL from the DATABASE_URL environment
    variable first and only falls back to sqlalchemy.url, so setting the config
    option alone is silently ignored wherever DATABASE_URL happens to be set --
    which is true in CI and false on a dev machine. Set both.
    """
    monkeypatch.setenv("DATABASE_URL", postgres_url)
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", postgres_url)
    return config


class TestMigrations:
    """Alembic is never exercised by the SQLite suite."""

    def test_upgrade_head_builds_the_schema(self, postgres_engine, alembic_config):
        command.upgrade(alembic_config, "head")

        tables = set(inspect(postgres_engine).get_table_names())
        assert {"invoices", "invoice_line_items", "clients", "user_profiles"} <= tables

    def test_letterhead_migration_round_trips(self, postgres_engine, alembic_config):
        """Upgrade adds the columns, downgrade removes them, upgrade restores."""
        config = alembic_config

        command.upgrade(config, "head")
        columns = {c["name"] for c in inspect(postgres_engine).get_columns("invoices")}
        assert columns >= LETTERHEAD_COLUMNS

        command.downgrade(config, "004_line_item_time_entry_name")
        inspect(postgres_engine).info_cache.clear()
        columns = {c["name"] for c in inspect(postgres_engine).get_columns("invoices")}
        assert not (LETTERHEAD_COLUMNS & columns)

        command.upgrade(config, "head")
        inspect(postgres_engine).info_cache.clear()
        columns = {c["name"] for c in inspect(postgres_engine).get_columns("invoices")}
        assert columns >= LETTERHEAD_COLUMNS

    def test_snapshots_are_really_jsonb(self, postgres_engine, alembic_config):
        """The variant type must resolve to JSONB here, not JSON or text."""
        command.upgrade(alembic_config, "head")

        with postgres_engine.connect() as conn:
            types = dict(
                conn.execute(
                    text(
                        "SELECT column_name, udt_name FROM information_schema.columns "
                        "WHERE table_name = 'invoices' "
                        "AND column_name IN ('issuer_snapshot', 'bill_to_snapshot')"
                    )
                ).all()
            )

        assert types == {"issuer_snapshot": "jsonb", "bill_to_snapshot": "jsonb"}

    def test_backfill_tolerates_an_empty_database(
        self, postgres_engine, alembic_config
    ):
        """It runs on every container start, usually against nothing."""
        command.upgrade(alembic_config, "head")

        with postgres_engine.connect() as conn:
            assert conn.execute(text("SELECT count(*) FROM invoices")).scalar() == 0


class TestJsonbBehaviour:
    """The columns the SQLite suite can only approximate."""

    def test_snapshot_round_trips_through_jsonb(
        self, postgres_session, postgres_client
    ):
        """SQLite stores JSON as text; Postgres parses it. Prove values survive."""
        snapshot = {
            "name": "Robert A Engel",
            "address_line2": None,
            "payment_instructions": "Line one\nLine two — with an em dash",
            "zip_code": "33713",
        }
        invoice = Invoice(
            invoice_number=1,
            client_id=postgres_client.id,
            period_start=date(2026, 8, 1),
            period_end=date(2026, 8, 14),
            hourly_rate=Decimal("150.00"),
            subtotal=Decimal("0.00"),
            total=Decimal("0.00"),
            status=InvoiceStatus.FINALIZED.value,
            issuer_snapshot=snapshot,
        )
        postgres_session.add(invoice)
        postgres_session.commit()
        postgres_session.expire_all()

        stored = postgres_session.get(Invoice, invoice.id).issuer_snapshot
        assert stored == snapshot
        assert stored["address_line2"] is None

    def test_snapshot_is_queryable_as_json(self, postgres_session, postgres_client):
        """If it is really JSONB, the server can reach inside it."""
        invoice = Invoice(
            invoice_number=2,
            client_id=postgres_client.id,
            period_start=date(2026, 8, 1),
            period_end=date(2026, 8, 14),
            hourly_rate=Decimal("150.00"),
            subtotal=Decimal("0.00"),
            total=Decimal("0.00"),
            status=InvoiceStatus.FINALIZED.value,
            issuer_snapshot={"name": "Queried By Postgres"},
        )
        postgres_session.add(invoice)
        postgres_session.commit()

        name = postgres_session.execute(
            text(
                "SELECT issuer_snapshot->>'name' FROM invoices WHERE invoice_number = 2"
            )
        ).scalar()
        assert name == "Queried By Postgres"

    def test_null_snapshot_stays_null(self, postgres_session, postgres_client):
        """A draft must store SQL NULL, not the JSON literal 'null'."""
        invoice = Invoice(
            invoice_number=3,
            client_id=postgres_client.id,
            period_start=date(2026, 8, 1),
            period_end=date(2026, 8, 14),
            hourly_rate=Decimal("150.00"),
            subtotal=Decimal("0.00"),
            total=Decimal("0.00"),
            status=InvoiceStatus.DRAFT.value,
        )
        postgres_session.add(invoice)
        postgres_session.commit()

        is_null = postgres_session.execute(
            text(
                "SELECT issuer_snapshot IS NULL FROM invoices WHERE invoice_number = 3"
            )
        ).scalar()
        assert is_null is True
