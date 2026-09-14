from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.domain.dates import require_monday, week_dates
from app.domain.policies import (
    ABSOLUTE_JUSTIFICATION_THRESHOLD,
    RELATIVE_JUSTIFICATION_THRESHOLD,
    can_override,
)
from app.domain.summaries import day_metrics, ward_week_summary
from app.persistence.models import StaffingDay, Ward
from app.schemas.staffing import (
    OverridePolicyResponse,
    StaffingDayResponse,
    StaffingWeekResponse,
    WardWeekResponse,
    WardWeekSummaryResponse,
)


def current_date_in_timezone(timezone_name: str, *, now: datetime | None = None) -> date:
    moment = now or datetime.now(tz=ZoneInfo(timezone_name))
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=ZoneInfo("UTC"))
    return moment.astimezone(ZoneInfo(timezone_name)).date()


def get_staffing_week(
    session: Session,
    *,
    week_start: date,
    today: date | None = None,
) -> StaffingWeekResponse:
    require_monday(week_start)
    dates = week_dates(week_start)
    week_end = dates[-1]

    wards = session.scalars(
        select(Ward)
        .options(selectinload(Ward.staffing_days).selectinload(StaffingDay.overrides))
        .order_by(Ward.code)
    ).all()

    ward_responses: list[WardWeekResponse] = []
    for ward in wards:
        ward_today = today or current_date_in_timezone(ward.timezone)
        days_by_date = {
            day.service_date: day
            for day in ward.staffing_days
            if week_start <= day.service_date <= week_end
        }

        day_responses: list[StaffingDayResponse] = []
        metrics = []
        for service_date in dates:
            staffing_day = days_by_date.get(service_date)
            if staffing_day is None:
                continue

            metric = day_metrics(
                forecast_demand=staffing_day.forecast_demand,
                planned_staffing=staffing_day.planned_staffing,
                overrides=list(staffing_day.overrides),
            )
            metrics.append(metric)
            day_responses.append(
                StaffingDayResponse(
                    date=service_date,
                    forecast_demand=metric.forecast_demand,
                    effective_demand=metric.effective_demand,
                    planned_staffing=metric.planned_staffing,
                    confidence=staffing_day.confidence,
                    is_corrected=metric.is_corrected,
                    can_override=can_override(service_date=service_date, today=ward_today),
                    understaffing=metric.understaffing,
                )
            )

        if not day_responses:
            continue

        summary = ward_week_summary(metrics)
        ward_responses.append(
            WardWeekResponse(
                id=ward.id,
                code=ward.code,
                name=ward.name,
                timezone=ward.timezone,
                days=day_responses,
                summary=WardWeekSummaryResponse(
                    total_understaffing=summary.total_understaffing,
                    manual_correction_count=summary.manual_correction_count,
                    average_absolute_deviation=summary.average_absolute_deviation,
                ),
            )
        )

    reference_today = today or current_date_in_timezone("Europe/Berlin")
    return StaffingWeekResponse(
        week_start=week_start,
        week_end=week_end,
        today=reference_today,
        override_policy=OverridePolicyResponse(
            absolute_justification_threshold=ABSOLUTE_JUSTIFICATION_THRESHOLD,
            relative_justification_threshold=RELATIVE_JUSTIFICATION_THRESHOLD,
        ),
        wards=ward_responses,
    )
