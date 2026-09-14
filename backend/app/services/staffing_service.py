from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.domain.dates import monday_of, require_monday, week_dates
from app.domain.policies import (
    ABSOLUTE_JUSTIFICATION_THRESHOLD,
    RELATIVE_JUSTIFICATION_THRESHOLD,
    NotFoundError,
    can_override,
    validate_demand_override,
)
from app.domain.summaries import day_metrics, effective_demand, ward_week_summary
from app.persistence.models import DemandOverride, StaffingDay, Ward
from app.schemas.staffing import (
    CreateDemandOverrideResponse,
    DemandOverrideHistoryResponse,
    DemandOverrideResponse,
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


def _summary_response(summary: object) -> WardWeekSummaryResponse:
    return WardWeekSummaryResponse(
        total_understaffing=summary.total_understaffing,  # type: ignore[attr-defined]
        manual_correction_count=summary.manual_correction_count,  # type: ignore[attr-defined]
        average_absolute_deviation=summary.average_absolute_deviation,  # type: ignore[attr-defined]
    )


def _day_response(staffing_day: StaffingDay, *, today: date) -> StaffingDayResponse:
    metric = day_metrics(
        forecast_demand=staffing_day.forecast_demand,
        planned_staffing=staffing_day.planned_staffing,
        overrides=list(staffing_day.overrides),
    )
    return StaffingDayResponse(
        date=staffing_day.service_date,
        forecast_demand=metric.forecast_demand,
        effective_demand=metric.effective_demand,
        planned_staffing=metric.planned_staffing,
        confidence=staffing_day.confidence,
        is_corrected=metric.is_corrected,
        can_override=can_override(service_date=staffing_day.service_date, today=today),
        understaffing=metric.understaffing,
    )


def _override_response(override: DemandOverride) -> DemandOverrideResponse:
    return DemandOverrideResponse(
        id=override.id,
        previous_demand=override.previous_demand,
        corrected_demand=override.corrected_demand,
        justification=override.justification,
        corrected_by=override.corrected_by,
        corrected_at=override.corrected_at,
    )


def _ward_week_summary_for(
    session: Session,
    *,
    ward: Ward,
    week_start: date,
) -> WardWeekSummaryResponse:
    dates = week_dates(week_start)
    week_end = dates[-1]
    days = session.scalars(
        select(StaffingDay)
        .where(
            StaffingDay.ward_id == ward.id,
            StaffingDay.service_date >= week_start,
            StaffingDay.service_date <= week_end,
        )
        .options(selectinload(StaffingDay.overrides))
        .order_by(StaffingDay.service_date)
    ).all()
    metrics = [
        day_metrics(
            forecast_demand=day.forecast_demand,
            planned_staffing=day.planned_staffing,
            overrides=list(day.overrides),
        )
        for day in days
    ]
    return _summary_response(ward_week_summary(metrics))


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
                summary=_summary_response(summary),
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


def _get_ward(session: Session, ward_id: UUID) -> Ward:
    ward = session.get(Ward, ward_id)
    if ward is None:
        raise NotFoundError(f"Ward '{ward_id}' was not found.")
    return ward


def _get_staffing_day(session: Session, *, ward_id: UUID, service_date: date) -> StaffingDay:
    staffing_day = session.scalar(
        select(StaffingDay)
        .where(StaffingDay.ward_id == ward_id, StaffingDay.service_date == service_date)
        .options(selectinload(StaffingDay.overrides))
    )
    if staffing_day is None:
        raise NotFoundError(
            f"Staffing day '{service_date.isoformat()}' was not found for ward '{ward_id}'."
        )
    return staffing_day


def create_demand_override(
    session: Session,
    *,
    ward_id: UUID,
    service_date: date,
    corrected_demand: Decimal,
    justification: str | None,
    today: date | None = None,
    now: datetime | None = None,
) -> CreateDemandOverrideResponse:
    ward = _get_ward(session, ward_id)
    staffing_day = _get_staffing_day(session, ward_id=ward_id, service_date=service_date)
    ward_today = today or current_date_in_timezone(ward.timezone)
    current_effective = effective_demand(
        staffing_day.forecast_demand,
        list(staffing_day.overrides),
    )
    cleaned_justification = validate_demand_override(
        service_date=service_date,
        today=ward_today,
        forecast_demand=staffing_day.forecast_demand,
        corrected_demand=corrected_demand,
        justification=justification,
    )

    override = DemandOverride(
        staffing_day_id=staffing_day.id,
        previous_demand=current_effective,
        corrected_demand=corrected_demand,
        justification=cleaned_justification,
        corrected_by=settings.audit_user,
        corrected_at=now or datetime.now(tz=timezone.utc),
    )
    session.add(override)
    session.commit()
    session.refresh(override)
    staffing_day = _get_staffing_day(session, ward_id=ward_id, service_date=service_date)

    week_start = monday_of(service_date)
    return CreateDemandOverrideResponse(
        override=_override_response(override),
        day=_day_response(staffing_day, today=ward_today),
        summary=_ward_week_summary_for(
            session,
            ward=ward,
            week_start=week_start,
        ),
    )


def get_override_history(
    session: Session,
    *,
    ward_id: UUID,
    service_date: date,
) -> DemandOverrideHistoryResponse:
    _get_ward(session, ward_id)
    staffing_day = _get_staffing_day(session, ward_id=ward_id, service_date=service_date)
    ordered = sorted(staffing_day.overrides, key=lambda item: item.corrected_at, reverse=True)
    return DemandOverrideHistoryResponse(items=[_override_response(item) for item in ordered])
