from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse


class WeekStartValidationError(ValueError):
    """Raised when weekStart is not an ISO Monday."""


async def week_start_validation_handler(_: Request, exc: WeekStartValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={
            "type": "invalid-week-start",
            "title": "Invalid week start",
            "status": 400,
            "detail": str(exc),
        },
    )
