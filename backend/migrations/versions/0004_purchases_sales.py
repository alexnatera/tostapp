"""add purchases and sales tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "purchases",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("supplier", sa.String(255), nullable=True),
        sa.Column("bean_origin", sa.String(120), nullable=True),
        sa.Column("kg_purchased", sa.Float(), nullable=False),
        sa.Column("price_per_kg", sa.Float(), nullable=False),
        sa.Column("purchase_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_purchases_user_id", "purchases", ["user_id"])

    op.create_table(
        "sales",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("customer", sa.String(255), nullable=True),
        sa.Column("kg_sold", sa.Float(), nullable=False),
        sa.Column("price_per_kg", sa.Float(), nullable=False),
        sa.Column("sale_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_sales_user_id", "sales", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_sales_user_id", "sales")
    op.drop_table("sales")
    op.drop_index("ix_purchases_user_id", "purchases")
    op.drop_table("purchases")
