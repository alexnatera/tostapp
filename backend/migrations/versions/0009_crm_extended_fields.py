"""extend crm fields: whatsapp, social media, address

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("customers", sa.Column("whatsapp", sa.Text(), nullable=True))
    op.add_column("customers", sa.Column("instagram", sa.Text(), nullable=True))
    op.add_column("customers", sa.Column("facebook", sa.Text(), nullable=True))
    op.add_column("customers", sa.Column("website", sa.Text(), nullable=True))
    op.add_column("customers", sa.Column("address", sa.Text(), nullable=True))
    op.add_column("customers", sa.Column("city", sa.Text(), nullable=True))
    op.add_column("customers", sa.Column("tax_id", sa.Text(), nullable=True))

    op.add_column("suppliers", sa.Column("whatsapp", sa.Text(), nullable=True))
    op.add_column("suppliers", sa.Column("website", sa.Text(), nullable=True))
    op.add_column("suppliers", sa.Column("address", sa.Text(), nullable=True))
    op.add_column("suppliers", sa.Column("city", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("suppliers", "city")
    op.drop_column("suppliers", "address")
    op.drop_column("suppliers", "website")
    op.drop_column("suppliers", "whatsapp")

    op.drop_column("customers", "tax_id")
    op.drop_column("customers", "city")
    op.drop_column("customers", "address")
    op.drop_column("customers", "website")
    op.drop_column("customers", "facebook")
    op.drop_column("customers", "instagram")
    op.drop_column("customers", "whatsapp")
