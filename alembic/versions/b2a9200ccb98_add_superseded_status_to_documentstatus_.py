"""add_superseded_status_to_documentstatus_enum

Revision ID: b2a9200ccb98
Revises: 05411387978c
Create Date: 2026-08-01 12:25:34.746132

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2a9200ccb98'
down_revision: Union[str, Sequence[str], None] = '05411387978c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from alembic import op


def upgrade() -> None:
    # Postgres cannot add a new enum label inside the same transaction
    # Alembic normally wraps migrations in. This ends that transaction
    # early so the ALTER TYPE below runs in autocommit mode instead.
    op.execute("COMMIT")
    op.execute("ALTER TYPE documentstatus ADD VALUE IF NOT EXISTS 'SUPERSEDED'")


def downgrade() -> None:
    # PostgreSQL has no ALTER TYPE ... DROP VALUE. Safely removing an enum
    # label requires rebuilding the type and every column using it, which
    # is out of scope for a plain rollback here.
    raise NotImplementedError(
        "Downgrading this migration is not supported: PostgreSQL does not "
        "support removing enum values directly."
    )
