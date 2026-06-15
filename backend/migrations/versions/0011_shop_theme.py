"""add shop_theme JSONB column to users

Revision ID: 0011
Revises: 0010
Create Date: 2026-06-15
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("shop_theme", JSONB, nullable=True))


def downgrade() -> None:
    op.drop_column("users", "shop_theme")
