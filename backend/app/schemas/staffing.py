from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, PlainSerializer
from pydantic.alias_generators import to_camel
from typing import Annotated

DecimalNumber = Annotated[Decimal, PlainSerializer(lambda value: float(value), return_type=float)]


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class OverridePolicyResponse(ApiModel):
    absolute_justification_threshold: DecimalNumber
    relative_justification_threshold: DecimalNumber


class WardWeekSummaryResponse(ApiModel):
    total_understaffing: DecimalNumber
    manual_correction_count: int
    average_absolute_deviation: DecimalNumber | None


class StaffingDayResponse(ApiModel):
    date: date
    forecast_demand: DecimalNumber
    effective_demand: DecimalNumber
    planned_staffing: DecimalNumber
    confidence: DecimalNumber
    is_corrected: bool
    can_override: bool
    understaffing: DecimalNumber


class WardWeekResponse(ApiModel):
    id: UUID
    code: str
    name: str
    timezone: str
    days: list[StaffingDayResponse]
    summary: WardWeekSummaryResponse


class StaffingWeekResponse(ApiModel):
    week_start: date
    week_end: date
    today: date
    override_policy: OverridePolicyResponse
    wards: list[WardWeekResponse]
