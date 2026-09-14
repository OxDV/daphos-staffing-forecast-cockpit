from __future__ import annotations

from datetime import date
from decimal import Decimal

ABSOLUTE_JUSTIFICATION_THRESHOLD = Decimal("2.00")
RELATIVE_JUSTIFICATION_THRESHOLD = Decimal("0.20")
MAX_JUSTIFICATION_LENGTH = 500


class OverrideValidationError(ValueError):
    def __init__(self, message: str, *, field_errors: dict[str, list[str]]) -> None:
        super().__init__(message)
        self.message = message
        self.field_errors = field_errors


class NotFoundError(LookupError):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def can_override(*, service_date: date, today: date) -> bool:
    return service_date >= today


def has_at_most_two_decimal_places(value: Decimal) -> bool:
    normalized = value.normalize()
    exponent = normalized.as_tuple().exponent
    return not isinstance(exponent, int) or exponent >= -2


def justification_required(*, forecast_demand: Decimal, corrected_demand: Decimal) -> bool:
    deviation = abs(corrected_demand - forecast_demand)
    if forecast_demand == 0:
        return corrected_demand != 0
    relative = deviation / forecast_demand
    return (
        deviation >= ABSOLUTE_JUSTIFICATION_THRESHOLD
        or relative >= RELATIVE_JUSTIFICATION_THRESHOLD
    )


def validate_demand_override(
    *,
    service_date: date,
    today: date,
    forecast_demand: Decimal,
    corrected_demand: Decimal,
    justification: str | None,
) -> str:
    field_errors: dict[str, list[str]] = {}

    if not can_override(service_date=service_date, today=today):
        raise OverrideValidationError(
            "Corrections are not allowed for past days.",
            field_errors={"serviceDate": ["Past days cannot be corrected."]},
        )

    if corrected_demand < 0:
        field_errors.setdefault("correctedDemand", []).append("Demand cannot be negative.")

    if not has_at_most_two_decimal_places(corrected_demand):
        field_errors.setdefault("correctedDemand", []).append(
            "Demand may have at most two decimal places."
        )

    cleaned_justification = (justification or "").strip()
    requires_reason = justification_required(
        forecast_demand=forecast_demand,
        corrected_demand=corrected_demand,
    )
    if requires_reason and not cleaned_justification:
        field_errors.setdefault("justification", []).append(
            "Provide a justification for this correction."
        )
    if len(cleaned_justification) > MAX_JUSTIFICATION_LENGTH:
        field_errors.setdefault("justification", []).append(
            f"Justification must be at most {MAX_JUSTIFICATION_LENGTH} characters."
        )

    if field_errors:
        raise OverrideValidationError(
            "Override request failed validation.",
            field_errors=field_errors,
        )

    return cleaned_justification
