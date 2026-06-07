"""initial schema: users + roasts + is_beta + roast_level check

Revision ID: 0001
Revises:
Create Date: 2026-06-07
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("roastery_name", sa.String(), nullable=False),
        sa.Column("is_beta", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "roasts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("bean_origin", sa.String(), nullable=False),
        sa.Column("farm", sa.String(), nullable=True),
        sa.Column("variety", sa.String(), nullable=True),
        sa.Column("process", sa.String(), nullable=True),
        sa.Column("roast_date", sa.Date(), nullable=False),
        sa.Column("roast_level", sa.String(), nullable=False),
        sa.Column("roast_time_minutes", sa.Float(), nullable=True),
        sa.Column("charge_temp", sa.Integer(), nullable=True),
        sa.Column("drop_temp", sa.Integer(), nullable=True),
        sa.Column("green_weight_g", sa.Integer(), nullable=True),
        sa.Column("roasted_weight_g", sa.Integer(), nullable=True),
        sa.Column("batch_number", sa.Integer(), nullable=True),
        sa.Column("tasting_notes", sa.String(), nullable=True),
        sa.Column("roaster_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("roast_level IN ('light', 'medium', 'dark')", name="ck_roasts_roast_level"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_roasts_slug", "roasts", ["slug"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_roasts_slug", table_name="roasts")
    op.drop_table("roasts")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
