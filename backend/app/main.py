from __future__ import annotations

from collections.abc import Generator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import WeekStartValidationError, week_start_validation_handler
from app.api.health import router as health_router
from app.api.staffing import router as staffing_router
from app.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(WeekStartValidationError, week_start_validation_handler)
app.include_router(health_router)
app.include_router(staffing_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": settings.app_name, "status": "ok"}
