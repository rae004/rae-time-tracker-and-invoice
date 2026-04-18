"""Convert duration tracking from integer seconds to millisecond precision.

Revision ID: 003_millisecond_precision
Revises: 002_nullable_project
Create Date: 2026-04-18

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003_millisecond_precision"
down_revision: str | None = "002_nullable_project"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Rename duration_seconds -> duration_ms and widen to BigInteger
    op.alter_column(
        "time_entries",
        "duration_seconds",
        new_column_name="duration_ms",
        type_=sa.BigInteger(),
        existing_type=sa.Integer(),
        existing_nullable=True,
    )
    # Convert existing second values to milliseconds
    op.execute(
        "UPDATE time_entries SET duration_ms = duration_ms * 1000 WHERE duration_ms IS NOT NULL"
    )

    # Widen invoice hours from Numeric(6,2) to Numeric(10,4)
    op.alter_column(
        "invoice_line_items",
        "hours",
        type_=sa.Numeric(10, 4),
        existing_type=sa.Numeric(6, 2),
        existing_nullable=False,
    )


def downgrade() -> None:
    # Convert milliseconds back to seconds (integer division, lossy)
    op.execute(
        "UPDATE time_entries SET duration_ms = duration_ms / 1000 WHERE duration_ms IS NOT NULL"
    )
    op.alter_column(
        "time_entries",
        "duration_ms",
        new_column_name="duration_seconds",
        type_=sa.Integer(),
        existing_type=sa.BigInteger(),
        existing_nullable=True,
    )

    op.alter_column(
        "invoice_line_items",
        "hours",
        type_=sa.Numeric(6, 2),
        existing_type=sa.Numeric(10, 4),
        existing_nullable=False,
    )
