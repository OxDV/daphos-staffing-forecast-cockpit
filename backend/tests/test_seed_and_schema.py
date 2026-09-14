from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.persistence.models import DemandOverride, StaffingDay, Ward
from app.seed import WARD_SPECS, iter_seed_dates, monday_of, reset_and_seed, seed_database


def test_monday_of_returns_iso_week_start() -> None:
    assert monday_of(date(2026, 9, 16)) == date(2026, 9, 14)


def test_iter_seed_dates_covers_five_weeks(fixed_today: date) -> None:
    dates = iter_seed_dates(fixed_today)

    assert len(dates) == 35
    assert dates[0] == date(2026, 9, 7)
    assert dates[-1] == date(2026, 10, 11)
    assert dates[0].weekday() == 0
    assert dates[-1].weekday() == 6


def test_unique_ward_code_constraint(session: Session) -> None:
    session.add(Ward(code="B3", name="Ward B3", timezone="Europe/Berlin"))
    session.commit()

    session.add(Ward(code="B3", name="Duplicate", timezone="Europe/Berlin"))
    with pytest.raises(IntegrityError):
        session.commit()


def test_unique_staffing_day_per_ward_and_date(session: Session) -> None:
    ward = Ward(code="B3", name="Ward B3", timezone="Europe/Berlin")
    session.add(ward)
    session.flush()

    session.add(
        StaffingDay(
            ward_id=ward.id,
            service_date=date(2026, 9, 15),
            forecast_demand=Decimal("10.00"),
            planned_staffing=Decimal("9.00"),
            confidence=Decimal("0.700"),
        )
    )
    session.commit()

    session.add(
        StaffingDay(
            ward_id=ward.id,
            service_date=date(2026, 9, 15),
            forecast_demand=Decimal("11.00"),
            planned_staffing=Decimal("10.00"),
            confidence=Decimal("0.650"),
        )
    )
    with pytest.raises(IntegrityError):
        session.commit()


def test_foreign_key_rejects_orphan_staffing_day(session: Session) -> None:
    import uuid

    session.add(
        StaffingDay(
            ward_id=uuid.uuid4(),
            service_date=date(2026, 9, 15),
            forecast_demand=Decimal("10.00"),
            planned_staffing=Decimal("9.00"),
            confidence=Decimal("0.700"),
        )
    )
    with pytest.raises(IntegrityError):
        session.commit()


def test_seed_creates_deterministic_dataset(session: Session, fixed_today: date) -> None:
    first = seed_database(session, today=fixed_today)

    assert first.created is True
    assert first.ward_count == len(WARD_SPECS)
    assert first.staffing_day_count == 35 * len(WARD_SPECS)
    assert first.override_count == 1
    assert first.week_start == date(2026, 9, 7)
    assert first.week_end == date(2026, 10, 11)

    wards = session.scalars(select(Ward).order_by(Ward.code)).all()
    assert [ward.code for ward in wards] == ["A2", "B3", "ICU"]

    override = session.scalar(select(DemandOverride))
    assert override is not None
    assert override.corrected_by == settings.audit_user
    assert override.justification
    assert override.corrected_demand - override.previous_demand == Decimal("2.00")

    staffing_day = session.get(StaffingDay, override.staffing_day_id)
    assert staffing_day is not None
    assert staffing_day.service_date > fixed_today


def test_seed_is_idempotent(session: Session, fixed_today: date) -> None:
    first = seed_database(session, today=fixed_today)
    second = seed_database(session, today=fixed_today)

    assert first.created is True
    assert second.created is False
    assert second.ward_count == first.ward_count
    assert second.staffing_day_count == first.staffing_day_count
    assert second.override_count == first.override_count

    assert session.scalar(select(func.count()).select_from(Ward)) == first.ward_count
    assert session.scalar(select(func.count()).select_from(StaffingDay)) == first.staffing_day_count
    assert session.scalar(select(func.count()).select_from(DemandOverride)) == first.override_count


def test_reset_and_seed_recreates_dataset(session: Session, fixed_today: date) -> None:
    first = seed_database(session, today=fixed_today)
    first_ward_id = session.scalars(select(Ward.id).where(Ward.code == "B3")).one()

    reset = reset_and_seed(session, today=fixed_today)
    second_ward_id = session.scalars(select(Ward.id).where(Ward.code == "B3")).one()

    assert reset.created is True
    assert reset.ward_count == first.ward_count
    assert reset.staffing_day_count == first.staffing_day_count
    assert reset.override_count == first.override_count
    assert second_ward_id != first_ward_id
    assert session.scalar(select(func.count()).select_from(DemandOverride)) == 1


def test_seed_requires_future_day_for_initial_override(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    today = date(2026, 9, 14)
    monkeypatch.setattr(
        "app.seed.iter_seed_dates",
        lambda _: [today - timedelta(days=1), today],
    )

    with pytest.raises(RuntimeError, match="future staffing day"):
        seed_database(session, today=today)


def test_seed_includes_past_current_and_future_weeks(session: Session, fixed_today: date) -> None:
    seed_database(session, today=fixed_today)
    dates = sorted(session.scalars(select(StaffingDay.service_date).distinct()).all())

    current_monday = monday_of(fixed_today)
    assert min(dates) == current_monday - timedelta(weeks=1)
    assert max(dates) == current_monday + timedelta(weeks=3, days=6)
    assert current_monday in dates
    assert current_monday + timedelta(days=6) in dates
