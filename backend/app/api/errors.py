from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse

from app.domain.policies import NotFoundError, OverrideValidationError


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


async def override_validation_handler(_: Request, exc: OverrideValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "type": "override-validation-error",
            "title": "Override validation failed",
            "status": 422,
            "detail": exc.message,
            "fieldErrors": exc.field_errors,
        },
    )


async def not_found_handler(_: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={
            "type": "resource-not-found",
            "title": "Resource not found",
            "status": 404,
            "detail": exc.message,
        },
    )
