"""add roastery_slug and whatsapp_number to users

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-15
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("roastery_slug", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("whatsapp_number", sa.String(30), nullable=True))

    # Generar slug para usuarios existentes usando regex básico de PostgreSQL
    # + 6 chars del UUID para garantizar unicidad
    op.execute("""
        UPDATE users
        SET roastery_slug = LOWER(
            REGEXP_REPLACE(roastery_name, '[^a-zA-Z0-9]+', '-', 'g')
        ) || '-' || SUBSTRING(id::text, 1, 6)
        WHERE roastery_slug IS NULL
    """)

    op.create_unique_constraint("uq_users_roastery_slug", "users", ["roastery_slug"])


def downgrade() -> None:
    op.drop_constraint("uq_users_roastery_slug", "users", type_="unique")
    op.drop_column("users", "whatsapp_number")
    op.drop_column("users", "roastery_slug")
