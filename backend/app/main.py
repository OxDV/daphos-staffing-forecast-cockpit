from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import (
    WeekStartValidationError,
    not_found_handler,
    override_validation_handler,
    week_start_validation_handler,
)
from app.api.health import router as health_router
from app.api.staffing import router as staffing_router
from app.api.test_support import router as test_support_router
from app.config import settings
from app.domain.policies import NotFoundError, OverrideValidationError

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(WeekStartValidationError, week_start_validation_handler)  # type: ignore[arg-type]
app.add_exception_handler(OverrideValidationError, override_validation_handler)  # type: ignore[arg-type]
app.add_exception_handler(NotFoundError, not_found_handler)  # type: ignore[arg-type]
app.include_router(health_router)
app.include_router(staffing_router)
if settings.allow_test_reset:
    app.include_router(test_support_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": settings.app_name, "status": "ok"}
