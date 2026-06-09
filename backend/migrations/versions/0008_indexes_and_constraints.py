"""add missing indexes and doc_number unique constraint

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-08
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index("idx_roasts_user_id", "roasts", ["user_id"], if_not_exists=True)
    op.create_index("idx_customers_user_id", "customers", ["user_id"], if_not_exists=True)
    op.create_index("idx_purchases_user_id", "purchases", ["user_id"], if_not_exists=True)
    op.create_index("idx_sales_user_id", "sales", ["user_id"], if_not_exists=True)
    op.create_index("idx_suppliers_user_id", "suppliers", ["user_id"], if_not_exists=True)
    # unique constraint: only create if not already present
    from sqlalchemy import inspect, text
    conn = op.get_bind()
    existing = [c["name"] for c in inspect(conn).get_unique_constraints("documents")]
    if "uq_documents_user_doctype_number" not in existing:
        op.create_unique_constraint(
            "uq_documents_user_doctype_number",
            "documents",
            ["user_id", "doc_type", "doc_number"],
        )


def downgrade() -> None:
    op.drop_constraint("uq_documents_user_doctype_number", "documents", type_="unique")
    op.drop_index("idx_suppliers_user_id", "suppliers")
    op.drop_index("idx_sales_user_id", "sales")
    op.drop_index("idx_purchases_user_id", "purchases")
    op.drop_index("idx_customers_user_id", "customers")
    op.drop_index("idx_roasts_user_id", "roasts")
