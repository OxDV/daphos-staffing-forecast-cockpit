from __future__ import annotations

from collections.abc import Generator
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.errors import WeekStartValidationError
from app.domain.dates import require_monday
from app.persistence.database import get_session
from app.schemas.staffing import StaffingWeekResponse
from app.services.staffing_service import get_staffing_week

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
