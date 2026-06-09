"""create products table

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sku", sa.String(100), nullable=True),
        sa.Column("unit", sa.String(20), server_default="unidad", nullable=False),
        sa.Column("price", sa.Numeric(12, 2), server_default="0", nullable=False),
        sa.Column("stock_quantity", sa.Numeric(12, 3), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_products_user_id", "products", ["user_id"])


def downgrade() -> None:
    op.drop_index("idx_products_user_id", "products")
    op.drop_table("products")
