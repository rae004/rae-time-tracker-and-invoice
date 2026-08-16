"""Add letterhead snapshots and service_description to invoices.

A finalized invoice is meant to be an immutable snapshot, but the issuer and
bill-to blocks were resolved live at PDF-render time, so reprinting an invoice
later produced a different document under the same number. These columns
complete the snapshot.

Revision ID: 005_invoice_letterhead_snapshot
Revises: 004_line_item_time_entry_name
Create Date: 2026-08-16

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "005_invoice_letterhead_snapshot"
down_revision: str | None = "004_line_item_time_entry_name"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Backfill existing finalized invoices from the current profile and each
# invoice's client. Strictly this asserts today's details were the details at
# issue time, which is not true -- the earliest invoices were finalized while
# the profile still held placeholder values. The corrected details are what
# those documents should say, so that is the intended outcome.
#
# Guarded so a re-run is a no-op, and written to tolerate an empty database:
# this migration runs on every fresh environment via entrypoint.sh, where
# user_profiles and clients are both empty and the UPDATE simply matches
# nothing.
BACKFILL_ISSUER = """
UPDATE invoices AS i
SET issuer_snapshot = jsonb_build_object(
        'name', p.name,
        'address_line1', p.address_line1,
        'address_line2', p.address_line2,
        'city', p.city,
        'state', p.state,
        'zip_code', p.zip_code,
        'phone', p.phone,
        'email', p.email,
        'payment_instructions', p.payment_instructions
    )
FROM user_profiles AS p
WHERE i.status = 'finalized'
  AND i.issuer_snapshot IS NULL
"""

BACKFILL_BILL_TO = """
UPDATE invoices AS i
SET bill_to_snapshot = jsonb_build_object(
        'name', c.name,
        'address_line1', c.address_line1,
        'address_line2', c.address_line2,
        'city', c.city,
        'state', c.state,
        'zip_code', c.zip_code,
        'phone', c.phone
    )
FROM clients AS c
WHERE i.client_id = c.id
  AND i.status = 'finalized'
  AND i.bill_to_snapshot IS NULL
"""

# service_description is invoice content rather than presentation, so it is
# captured at create alongside hourly_rate going forward. Existing rows predate
# the column and are backfilled from their client here.
BACKFILL_SERVICE_DESCRIPTION = """
UPDATE invoices AS i
SET service_description = c.service_description
FROM clients AS c
WHERE i.client_id = c.id
  AND i.service_description IS NULL
"""


def upgrade() -> None:
    op.add_column(
        "invoices",
        sa.Column("service_description", sa.Text(), nullable=True),
    )
    op.add_column(
        "invoices",
        sa.Column("issuer_snapshot", JSONB(), nullable=True),
    )
    op.add_column(
        "invoices",
        sa.Column("bill_to_snapshot", JSONB(), nullable=True),
    )
    op.add_column(
        "invoices",
        sa.Column("letterhead_refreshed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.execute(sa.text(BACKFILL_SERVICE_DESCRIPTION))
    op.execute(sa.text(BACKFILL_ISSUER))
    op.execute(sa.text(BACKFILL_BILL_TO))


def downgrade() -> None:
    op.drop_column("invoices", "letterhead_refreshed_at")
    op.drop_column("invoices", "bill_to_snapshot")
    op.drop_column("invoices", "issuer_snapshot")
    op.drop_column("invoices", "service_description")
