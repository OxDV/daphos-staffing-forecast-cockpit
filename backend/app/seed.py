from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from random import Random
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
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

    # One seeded override on a future day of Ward B3 so audit history is visible immediately.
    b3 = next(ward for ward in wards if ward.code == "B3")
    future_candidates = [
        day
        for day in staffing_days
        if day.ward_id == b3.id and day.service_date > reference_day
    ]
    if not future_candidates:
        raise RuntimeError("Seed dataset must include at least one future staffing day.")

    target_day = future_candidates[min(2, len(future_candidates) - 1)]
    corrected = target_day.forecast_demand + Decimal("2.00")
    session.add(
        DemandOverride(
            staffing_day_id=target_day.id,
            previous_demand=target_day.forecast_demand,
            corrected_demand=corrected,
            justification="Two additional high-acuity admissions expected",
            corrected_by=settings.audit_user,
            corrected_at=datetime(
                reference_day.year,
                reference_day.month,
                reference_day.day,
                8,
                0,
                tzinfo=timezone.utc,
            ),
        )
    )
    session.commit()

    return SeedResult(
        created=True,
        ward_count=len(wards),
        staffing_day_count=len(staffing_days),
        override_count=1,
        week_start=dates[0],
        week_end=dates[-1],
    )


def main() -> None:  # pragma: no cover
    from app.persistence.database import SessionLocal

    session = SessionLocal()
    try:
        result = seed_database(session)
        action = "created" if result.created else "already present"
        print(
            f"Seed {action}: wards={result.ward_count}, "
            f"days={result.staffing_day_count}, overrides={result.override_count}, "
            f"range={result.week_start.isoformat()}..{result.week_end.isoformat()}"
        )
    finally:
        session.close()


if __name__ == "__main__":  # pragma: no cover
    main()
