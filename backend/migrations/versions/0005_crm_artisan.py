"""add customers, suppliers, profile_data, and FKs

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # customers table
    op.create_table(
        "customers",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("type", sa.Text(), server_default="B2B", nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_customers_user_id", "customers", ["user_id"])

    # suppliers table
    op.create_table(
        "suppliers",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("phone", sa.Text(), nullable=True),
        sa.Column("contact_person", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_suppliers_user_id", "suppliers", ["user_id"])

    # Add customer_id FK to sales
    op.add_column("sales", sa.Column("customer_id", sa.String(), nullable=True))
    op.create_foreign_key(
        "fk_sales_customer_id",
        "sales", "customers",
        ["customer_id"], ["id"],
        ondelete="SET NULL",
    )

    # Add supplier_id FK to purchases
    op.add_column("purchases", sa.Column("supplier_id", sa.String(), nullable=True))
    op.create_foreign_key(
        "fk_purchases_supplier_id",
        "purchases", "suppliers",
        ["supplier_id"], ["id"],
        ondelete="SET NULL",
    )

    # Add profile_data JSONB to roasts
    op.add_column("roasts", sa.Column("profile_data", JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("roasts", "profile_data")
    op.drop_constraint("fk_purchases_supplier_id", "purchases", type_="foreignkey")
    op.drop_column("purchases", "supplier_id")
    op.drop_constraint("fk_sales_customer_id", "sales", type_="foreignkey")
    op.drop_column("sales", "customer_id")
    op.drop_index("idx_suppliers_user_id", "suppliers")
    op.drop_table("suppliers")
    op.drop_index("idx_customers_user_id", "customers")
    op.drop_table("customers")
