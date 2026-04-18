"""Make time_entries.project_id nullable for quick-start timers.

Revision ID: 002_nullable_project
Revises: 001_initial
Create Date: 2026-04-11

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002_nullable_project"
down_revision: str | None = "001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "time_entries",
        "project_id",
        existing_type=sa.UUID(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "time_entries",
        "project_id",
        existing_type=sa.UUID(),
        nullable=False,
    )
