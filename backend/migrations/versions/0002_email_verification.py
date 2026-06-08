"""email verification + password reset + account lockout fields

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("verification_code", sa.String(6), nullable=True))
    op.add_column("users", sa.Column("verification_code_expires", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("reset_token", sa.String(), nullable=True))
    op.add_column("users", sa.Column("reset_token_expires", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("login_attempts", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "locked_until")
    op.drop_column("users", "login_attempts")
    op.drop_column("users", "reset_token_expires")
    op.drop_column("users", "reset_token")
    op.drop_column("users", "verification_code_expires")
    op.drop_column("users", "verification_code")
    op.drop_column("users", "email_verified")
