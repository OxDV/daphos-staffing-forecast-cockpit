from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.staffing import get_db_session
from app.config import settings
from app.seed import SeedResult, reset_and_seed

router = APIRouter(prefix="/api/v1/test", tags=["test-support"])


@router.post("/reset-seed", response_model=dict[str, object])
def reset_seed(session: Session = Depends(get_db_session)) -> dict[str, object]:
    if not settings.allow_test_reset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    result: SeedResult = reset_and_seed(session)
    return {
        "created": result.created,
        "wardCount": result.ward_count,
        "staffingDayCount": result.staffing_day_count,
        "overrideCount": result.override_count,
        "weekStart": result.week_start.isoformat(),
        "weekEnd": result.week_end.isoformat(),
    }
