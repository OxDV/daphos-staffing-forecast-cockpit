from __future__ import annotations

from collections.abc import Generator
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.errors import WeekStartValidationError
from app.domain.dates import require_monday
from app.persistence.database import get_session
from app.schemas.staffing import (
    CreateDemandOverrideRequest,
    CreateDemandOverrideResponse,
    DemandOverrideHistoryResponse,
    StaffingWeekResponse,
)
from app.services.staffing_service import (
    create_demand_override,
    get_override_history,
    get_staffing_week,
)

router = APIRouter(prefix="/api/v1", tags=["staffing"])


def get_db_session() -> Generator[Session, None, None]:
    yield from get_session()


@router.get("/staffing-weeks", response_model=StaffingWeekResponse)
def read_staffing_week(
    week_start: date = Query(..., alias="weekStart"),
    session: Session = Depends(get_db_session),
) -> StaffingWeekResponse:
    try:
        require_monday(week_start)
    except ValueError as exc:
        raise WeekStartValidationError(str(exc)) from exc

    return get_staffing_week(session, week_start=week_start)


@router.post(
    "/wards/{ward_id}/staffing-days/{service_date}/overrides",
    response_model=CreateDemandOverrideResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_override(
    ward_id: UUID,
    service_date: date,
    payload: CreateDemandOverrideRequest,
    session: Session = Depends(get_db_session),
) -> CreateDemandOverrideResponse:
    return create_demand_override(
        session,
        ward_id=ward_id,
        service_date=service_date,
        corrected_demand=payload.corrected_demand,
        justification=payload.justification,
    )


@router.get(
    "/wards/{ward_id}/staffing-days/{service_date}/overrides",
    response_model=DemandOverrideHistoryResponse,
)
def read_override_history(
    ward_id: UUID,
    service_date: date,
    session: Session = Depends(get_db_session),
) -> DemandOverrideHistoryResponse:
    return get_override_history(session, ward_id=ward_id, service_date=service_date)
