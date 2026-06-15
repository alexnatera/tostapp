"""add index on roasts.user_id for query performance

Revision ID: 0013
Revises: 0012
Create Date: 2026-06-15
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index("ix_roasts_user_id", "roasts", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_roasts_user_id", table_name="roasts")
