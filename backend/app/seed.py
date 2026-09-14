from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from random import Random
from zoneinfo import ZoneInfo

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.domain.dates import monday_of
from app.persistence.models import DemandOverride, StaffingDay, Ward

SEED_VERSION = 20260811
WARD_SPECS = (
    ("B3", "Ward B3", "Europe/Berlin"),
    ("ICU", "ICU", "Europe/Berlin"),
    ("A2", "Ward A2", "Europe/Berlin"),
)
WEEKS_BEFORE = 1
WEEKS_AFTER = 3


@dataclass(frozen=True)
class SeedResult:
    created: bool
    ward_count: int
    staffing_day_count: int
    override_count: int
    week_start: date
    week_end: date


def iter_seed_dates(today: date) -> list[date]:
    current_monday = monday_of(today)
    start = current_monday - timedelta(weeks=WEEKS_BEFORE)
    end = current_monday + timedelta(weeks=WEEKS_AFTER, days=6)
    total_days = (end - start).days + 1
    return [start + timedelta(days=offset) for offset in range(total_days)]


def _quantize(value: float) -> Decimal:
    return Decimal(str(round(value, 2)))


def _confidence(rng: Random) -> Decimal:
    band = rng.choice(("low", "medium", "high"))
    if band == "low":
        return Decimal(str(round(rng.uniform(0.35, 0.59), 3)))
    if band == "medium":
        return Decimal(str(round(rng.uniform(0.60, 0.79), 3)))
    return Decimal(str(round(rng.uniform(0.80, 0.95), 3)))


def _staffing_for_demand(rng: Random, forecast: Decimal) -> Decimal:
    pattern = rng.choice(("short", "balanced", "surplus"))
    if pattern == "short":
        delta = Decimal(str(rng.choice([1, 1.5, 2, 2.5, 3])))
        return max(Decimal("0.00"), forecast - delta)
    if pattern == "surplus":
        delta = Decimal(str(rng.choice([1, 1.5, 2])))
        return forecast + delta
    return forecast


def seed_database(
    session: Session,
    *,
    today: date | None = None,
    random_seed: int = SEED_VERSION,
) -> SeedResult:
    """Populate the database with a reproducible five-week dataset.

    The seed is idempotent: if wards already exist, existing rows are left unchanged.
    """
    reference_day = today or datetime.now(tz=ZoneInfo("Europe/Berlin")).date()
    dates = iter_seed_dates(reference_day)

    existing_wards = session.scalar(select(func.count()).select_from(Ward)) or 0
    if existing_wards > 0:
        return SeedResult(
            created=False,
            ward_count=existing_wards,
            staffing_day_count=session.scalar(select(func.count()).select_from(StaffingDay)) or 0,
            override_count=session.scalar(select(func.count()).select_from(DemandOverride)) or 0,
            week_start=dates[0],
            week_end=dates[-1],
        )

    return _create_seed_dataset(session, dates=dates, reference_day=reference_day, random_seed=random_seed)


def reset_and_seed(
    session: Session,
    *,
    today: date | None = None,
    random_seed: int = SEED_VERSION,
) -> SeedResult:
    """Delete all staffing rows and recreate the deterministic seed dataset."""
    reference_day = today or datetime.now(tz=ZoneInfo("Europe/Berlin")).date()
    dates = iter_seed_dates(reference_day)

    session.execute(delete(DemandOverride))
    session.execute(delete(StaffingDay))
    session.execute(delete(Ward))
    session.commit()

    return _create_seed_dataset(session, dates=dates, reference_day=reference_day, random_seed=random_seed)


def _create_seed_dataset(
    session: Session,
    *,
    dates: list[date],
    reference_day: date,
    random_seed: int,
) -> SeedResult:
    rng = Random(random_seed)
    wards: list[Ward] = []
    for code, name, tz_name in WARD_SPECS:
        wards.append(Ward(code=code, name=name, timezone=tz_name))
    session.add_all(wards)
    session.flush()

    staffing_days: list[StaffingDay] = []
    for ward in wards:
        for service_date in dates:
            forecast = _quantize(rng.uniform(6.0, 16.0))
            planned = _staffing_for_demand(rng, forecast)
            staffing_days.append(
                StaffingDay(
                    ward_id=ward.id,
                    service_date=service_date,
                    forecast_demand=forecast,
                    planned_staffing=planned,
                    confidence=_confidence(rng),
                )
            )
    session.add_all(staffing_days)
    session.flush()

    overrides = _build_seed_overrides(
        wards=wards,
        staffing_days=staffing_days,
        reference_day=reference_day,
    )
    session.add_all(overrides)
    session.commit()

    return SeedResult(
        created=True,
        ward_count=len(wards),
        staffing_day_count=len(staffing_days),
        override_count=len(overrides),
        week_start=dates[0],
        week_end=dates[-1],
    )


def _days_for_ward(wards: list[Ward], staffing_days: list[StaffingDay], code: str) -> list[StaffingDay]:
    ward = next(item for item in wards if item.code == code)
    return sorted(
        (day for day in staffing_days if day.ward_id == ward.id),
        key=lambda day: day.service_date,
    )


def _pick(days: list[StaffingDay], index: int) -> StaffingDay:
    return days[min(index, len(days) - 1)]


def _override(
    *,
    day: StaffingDay,
    previous_demand: Decimal,
    corrected_demand: Decimal,
    justification: str,
    reference_day: date,
    hour: int,
    minute: int = 0,
) -> DemandOverride:
    return DemandOverride(
        staffing_day_id=day.id,
        previous_demand=previous_demand,
        corrected_demand=corrected_demand,
        justification=justification,
        corrected_by=settings.audit_user,
        corrected_at=datetime(
            reference_day.year,
            reference_day.month,
            reference_day.day,
            hour,
            minute,
            tzinfo=UTC,
        ),
    )


def _build_seed_overrides(
    *,
    wards: list[Ward],
    staffing_days: list[StaffingDay],
    reference_day: date,
) -> list[DemandOverride]:
    b3_days = _days_for_ward(wards, staffing_days, "B3")
    icu_days = _days_for_ward(wards, staffing_days, "ICU")
    a2_days = _days_for_ward(wards, staffing_days, "A2")

    b3_future = [day for day in b3_days if day.service_date > reference_day]
    b3_past = [day for day in b3_days if day.service_date < reference_day]
    icu_future = [day for day in icu_days if day.service_date > reference_day]
    a2_future = [day for day in a2_days if day.service_date > reference_day]
    a2_past = [day for day in a2_days if day.service_date < reference_day]

    if not b3_future or not icu_future or not a2_future:
        raise RuntimeError("Seed dataset must include at least one future staffing day.")

    overrides: list[DemandOverride] = []

    b3_primary = _pick(b3_future, 1)
    first_corrected = b3_primary.forecast_demand + Decimal("2.00")
    overrides.append(
        _override(
            day=b3_primary,
            previous_demand=b3_primary.forecast_demand,
            corrected_demand=first_corrected,
            justification="Two additional high-acuity admissions expected",
            reference_day=reference_day,
            hour=8,
        )
    )
    overrides.append(
        _override(
            day=b3_primary,
            previous_demand=first_corrected,
            corrected_demand=first_corrected + Decimal("1.00"),
            justification="Overnight escalation: one more monitored bed required",
            reference_day=reference_day,
            hour=14,
            minute=30,
        )
    )

    b3_second = _pick(b3_future, 3)
    overrides.append(
        _override(
            day=b3_second,
            previous_demand=b3_second.forecast_demand,
            corrected_demand=b3_second.forecast_demand + Decimal("2.50"),
            justification="Planned transfers from ED confirmed for afternoon",
            reference_day=reference_day,
            hour=9,
            minute=15,
        )
    )

    b3_third = _pick(b3_future, 5)
    overrides.append(
        _override(
            day=b3_third,
            previous_demand=b3_third.forecast_demand,
            corrected_demand=max(Decimal("0.00"), b3_third.forecast_demand - Decimal("1.50")),
            justification="Two early discharges confirmed by attending",
            reference_day=reference_day,
            hour=11,
        )
    )

    icu_primary = _pick(icu_future, 2)
    overrides.append(
        _override(
            day=icu_primary,
            previous_demand=icu_primary.forecast_demand,
            corrected_demand=icu_primary.forecast_demand + Decimal("3.00"),
            justification="Extra isolation room opening for outbreak cohort",
            reference_day=reference_day,
            hour=7,
            minute=45,
        )
    )

    icu_second = _pick(icu_future, 4)
    overrides.append(
        _override(
            day=icu_second,
            previous_demand=icu_second.forecast_demand,
            corrected_demand=icu_second.forecast_demand + Decimal("1.50"),
            justification="Delayed step-down: keep one ICU nurse longer",
            reference_day=reference_day,
            hour=16,
        )
    )

    a2_primary = _pick(a2_future, 1)
    overrides.append(
        _override(
            day=a2_primary,
            previous_demand=a2_primary.forecast_demand,
            corrected_demand=a2_primary.forecast_demand + Decimal("2.00"),
            justification="Orthopedic list overbooked by two cases",
            reference_day=reference_day,
            hour=10,
        )
    )

    if b3_past:
        b3_historical = _pick(b3_past, 2)
        overrides.append(
            _override(
                day=b3_historical,
                previous_demand=b3_historical.forecast_demand,
                corrected_demand=b3_historical.forecast_demand + Decimal("2.00"),
                justification="Weekend surge recorded after the shift (historical)",
                reference_day=reference_day,
                hour=18,
            )
        )

    if a2_past:
        a2_historical = _pick(a2_past, 1)
        overrides.append(
            _override(
                day=a2_historical,
                previous_demand=a2_historical.forecast_demand,
                corrected_demand=a2_historical.forecast_demand + Decimal("1.50"),
                justification="Manual correction after ward round (historical)",
                reference_day=reference_day,
                hour=19,
                minute=20,
            )
        )

    return overrides


def main() -> None:  # pragma: no cover
    import sys

    from app.persistence.database import SessionLocal

    reset = "--reset" in sys.argv
    session = SessionLocal()
    try:
        result = reset_and_seed(session) if reset else seed_database(session)
        action = "reset" if reset else ("created" if result.created else "already present")
        print(
            f"Seed {action}: wards={result.ward_count}, "
            f"days={result.staffing_day_count}, overrides={result.override_count}, "
            f"range={result.week_start.isoformat()}..{result.week_end.isoformat()}"
        )
    finally:
        session.close()


if __name__ == "__main__":  # pragma: no cover
    main()
