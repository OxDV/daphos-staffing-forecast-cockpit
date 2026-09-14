"""Create wards, staffing_days, and demand_overrides.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-09-14 15:10:00
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "wards",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "staffing_days",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("ward_id", sa.Uuid(), nullable=False),
        sa.Column("service_date", sa.Date(), nullable=False),
        sa.Column("forecast_demand", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("planned_staffing", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("confidence", sa.Numeric(precision=4, scale=3), nullable=False),
        sa.ForeignKeyConstraint(["ward_id"], ["wards.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ward_id", "service_date", name="uq_staffing_day_ward_date"),
    )
    op.create_table(
        "demand_overrides",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("staffing_day_id", sa.Uuid(), nullable=False),
        sa.Column("previous_demand", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("corrected_demand", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("justification", sa.String(length=500), nullable=False),
        sa.Column("corrected_by", sa.String(length=128), nullable=False),
        sa.Column("corrected_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["staffing_day_id"], ["staffing_days.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("demand_overrides")
    op.drop_table("staffing_days")
    op.drop_table("wards")
