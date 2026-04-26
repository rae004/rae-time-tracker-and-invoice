"""Add time_entry_name column to invoice_line_items.

Revision ID: 004_line_item_time_entry_name
Revises: 003_millisecond_precision
Create Date: 2026-04-27

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "004_line_item_time_entry_name"
down_revision: str | None = "003_millisecond_precision"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "invoice_line_items",
        sa.Column("time_entry_name", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("invoice_line_items", "time_entry_name")
