"""add business profile to users and create documents table

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Business profile columns on users
    op.add_column("users", sa.Column("business_address", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("business_phone", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("business_email", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("business_tax_id", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("business_logo", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("business_website", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("business_city", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("business_country", sa.String(100), nullable=True))

    # Documents table
    op.create_table(
        "documents",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("doc_type", sa.String(20), nullable=False),
        sa.Column("doc_number", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), server_default="borrador", nullable=False),
        sa.Column("client_name", sa.Text(), nullable=True),
        sa.Column("client_email", sa.Text(), nullable=True),
        sa.Column("client_address", sa.Text(), nullable=True),
        sa.Column("client_tax_id", sa.Text(), nullable=True),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("items", JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), server_default="0", nullable=False),
        sa.Column("tax_rate", sa.Numeric(5, 2), server_default="0", nullable=False),
        sa.Column("tax_amount", sa.Numeric(12, 2), server_default="0", nullable=False),
        sa.Column("total", sa.Numeric(12, 2), server_default="0", nullable=False),
        sa.Column("currency", sa.String(10), server_default="CLP", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_documents_user_id", "documents", ["user_id"])


def downgrade() -> None:
    op.drop_index("idx_documents_user_id", "documents")
    op.drop_table("documents")
    op.drop_column("users", "business_country")
    op.drop_column("users", "business_city")
    op.drop_column("users", "business_website")
    op.drop_column("users", "business_logo")
    op.drop_column("users", "business_tax_id")
    op.drop_column("users", "business_email")
    op.drop_column("users", "business_phone")
    op.drop_column("users", "business_address")
