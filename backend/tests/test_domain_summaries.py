from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.domain.dates import monday_of, require_monday, week_dates
from app.domain.policies import can_override
from app.domain.summaries import day_metrics, effective_demand, understaffing, ward_week_summary


def test_require_monday_accepts_monday() -> None:
    require_monday(date(2026, 9, 14))


def test_require_monday_rejects_other_days() -> None:
    with pytest.raises(ValueError, match="Monday"):
        require_monday(date(2026, 9, 15))


def test_week_dates_returns_seven_ordered_days() -> None:
    assert week_dates(date(2026, 9, 14)) == [
        date(2026, 9, 14),
        date(2026, 9, 15),
        date(2026, 9, 16),
        date(2026, 9, 17),
        date(2026, 9, 18),
        date(2026, 9, 19),
        date(2026, 9, 20),
    ]
    assert monday_of(date(2026, 9, 16)) == date(2026, 9, 14)


def test_can_override_for_today_and_future_only() -> None:
    today = date(2026, 9, 14)
    assert can_override(service_date=today, today=today) is True
    assert can_override(service_date=date(2026, 9, 15), today=today) is True
    assert can_override(service_date=date(2026, 9, 13), today=today) is False


def test_effective_demand_uses_latest_override() -> None:
    forecast = Decimal("10.00")
    overrides = [
        SimpleNamespace(
            corrected_demand=Decimal("11.00"),
            corrected_at=datetime(2026, 9, 14, 8, 0, tzinfo=timezone.utc),
        ),
        SimpleNamespace(
            corrected_demand=Decimal("14.00"),
            corrected_at=datetime(2026, 9, 14, 10, 0, tzinfo=timezone.utc),
        ),
    ]

    assert effective_demand(forecast, []) == forecast
    assert effective_demand(forecast, overrides) == Decimal("14.00")


def test_understaffing_never_negative() -> None:
    assert understaffing(Decimal("12.00"), Decimal("10.00")) == Decimal("2.00")
    assert understaffing(Decimal("8.00"), Decimal("10.00")) == Decimal("0.00")


def test_day_metrics_and_summary_with_corrections() -> None:
    first = day_metrics(
        forecast_demand=Decimal("10.00"),
        planned_staffing=Decimal("8.00"),
        overrides=[
            SimpleNamespace(
                corrected_demand=Decimal("12.00"),
                corrected_at=datetime(2026, 9, 14, 8, 0, tzinfo=timezone.utc),
            )
        ],
    )
    second = day_metrics(
        forecast_demand=Decimal("9.00"),
        planned_staffing=Decimal("9.00"),
        overrides=[],
    )

    summary = ward_week_summary([first, second])

    assert first.is_corrected is True
    assert first.understaffing == Decimal("4.00")
    assert summary.total_understaffing == Decimal("4.00")
    assert summary.manual_correction_count == 1
    assert summary.average_absolute_deviation == Decimal("2.00")


def test_summary_average_is_null_without_corrections() -> None:
    day = day_metrics(
        forecast_demand=Decimal("10.00"),
        planned_staffing=Decimal("10.00"),
        overrides=[],
    )
    summary = ward_week_summary([day])

    assert summary.manual_correction_count == 0
    assert summary.average_absolute_deviation is None
