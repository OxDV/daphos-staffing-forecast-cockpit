from __future__ import annotations

from datetime import date, timedelta


def monday_of(day: date) -> date:
    return day - timedelta(days=day.weekday())


def week_dates(week_start: date) -> list[date]:
    return [week_start + timedelta(days=offset) for offset in range(7)]


def require_monday(week_start: date) -> None:
    if week_start.weekday() != 0:
        raise ValueError("weekStart must be a Monday.")
