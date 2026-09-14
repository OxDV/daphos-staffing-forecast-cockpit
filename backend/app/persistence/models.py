from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.persistence.database import Base


class Ward(Base):
    __tablename__ = "wards"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="Europe/Berlin")

    staffing_days: Mapped[list[StaffingDay]] = relationship(
        back_populates="ward",
        cascade="all, delete-orphan",
    )


class StaffingDay(Base):
    __tablename__ = "staffing_days"
    __table_args__ = (UniqueConstraint("ward_id", "service_date", name="uq_staffing_day_ward_date"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ward_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("wards.id", ondelete="CASCADE"),
        nullable=False,
    )
    service_date: Mapped[date] = mapped_column(Date, nullable=False)
    forecast_demand: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    planned_staffing: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    confidence: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)

    ward: Mapped[Ward] = relationship(back_populates="staffing_days")
    overrides: Mapped[list[DemandOverride]] = relationship(
        back_populates="staffing_day",
        cascade="all, delete-orphan",
        order_by="DemandOverride.corrected_at",
    )


class DemandOverride(Base):
    __tablename__ = "demand_overrides"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    staffing_day_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("staffing_days.id", ondelete="CASCADE"),
        nullable=False,
    )
    previous_demand: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    corrected_demand: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    justification: Mapped[str] = mapped_column(String(500), nullable=False)
    corrected_by: Mapped[str] = mapped_column(String(128), nullable=False)
    corrected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    staffing_day: Mapped[StaffingDay] = relationship(back_populates="overrides")
