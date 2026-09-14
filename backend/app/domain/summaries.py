from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Protocol


class OverrideLike(Protocol):
    corrected_demand: Decimal
    corrected_at: datetime


@dataclass(frozen=True)
class DayMetrics:
    forecast_demand: Decimal
    effective_demand: Decimal
    planned_staffing: Decimal
    understaffing: Decimal
    is_corrected: bool
    override_count: int
    absolute_deviation: Decimal


@dataclass(frozen=True)
class WardWeekSummary:
    total_understaffing: Decimal
    manual_correction_count: int
    average_absolute_deviation: Decimal | None


def latest_corrected_demand(overrides: list[OverrideLike]) -> Decimal | None:
    if not overrides:
        return None
    latest = max(overrides, key=lambda item: item.corrected_at)
    return latest.corrected_demand


def effective_demand(forecast_demand: Decimal, overrides: list[OverrideLike]) -> Decimal:
    corrected = latest_corrected_demand(overrides)
    return corrected if corrected is not None else forecast_demand


def understaffing(effective: Decimal, planned_staffing: Decimal) -> Decimal:
    gap = effective - planned_staffing
    return gap if gap > 0 else Decimal("0.00")


def day_metrics(
    *,
    forecast_demand: Decimal,
    planned_staffing: Decimal,
    overrides: list[OverrideLike],
) -> DayMetrics:
    effective = effective_demand(forecast_demand, overrides)
    return DayMetrics(
        forecast_demand=forecast_demand,
        effective_demand=effective,
        planned_staffing=planned_staffing,
        understaffing=understaffing(effective, planned_staffing),
        is_corrected=bool(overrides),
        override_count=len(overrides),
        absolute_deviation=abs(effective - forecast_demand),
    )


def ward_week_summary(days: list[DayMetrics]) -> WardWeekSummary:
    total_understaffing = sum((day.understaffing for day in days), Decimal("0.00"))
    manual_correction_count = sum(day.override_count for day in days)
    corrected_days = [day for day in days if day.override_count > 0]
    if not corrected_days:
        average_absolute_deviation: Decimal | None = None
    else:
        total_deviation = sum((day.absolute_deviation for day in corrected_days), Decimal("0.00"))
        average_absolute_deviation = total_deviation / Decimal(len(corrected_days))

    return WardWeekSummary(
        total_understaffing=total_understaffing,
        manual_correction_count=manual_correction_count,
        average_absolute_deviation=average_absolute_deviation,
    )
