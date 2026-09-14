from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest

from app.domain.policies import (
    OverrideValidationError,
    has_at_most_two_decimal_places,
    justification_required,
    validate_demand_override,
)


def test_justification_required_on_absolute_and_relative_thresholds() -> None:
    assert justification_required(forecast_demand=Decimal("10"), corrected_demand=Decimal("11.99")) is False
    assert justification_required(forecast_demand=Decimal("10"), corrected_demand=Decimal("12")) is True
    assert justification_required(forecast_demand=Decimal("10"), corrected_demand=Decimal("12.00")) is True
    assert justification_required(forecast_demand=Decimal("10"), corrected_demand=Decimal("8")) is True
    assert justification_required(forecast_demand=Decimal("0"), corrected_demand=Decimal("0")) is False
    assert justification_required(forecast_demand=Decimal("0"), corrected_demand=Decimal("1")) is True


def test_has_at_most_two_decimal_places() -> None:
    assert has_at_most_two_decimal_places(Decimal("1.25")) is True
    assert has_at_most_two_decimal_places(Decimal("1.2")) is True
    assert has_at_most_two_decimal_places(Decimal("1")) is True
    assert has_at_most_two_decimal_places(Decimal("1.234")) is False


def test_validate_demand_override_rejects_past_and_invalid_values() -> None:
    with pytest.raises(OverrideValidationError) as past_error:
        validate_demand_override(
            service_date=date(2026, 9, 13),
            today=date(2026, 9, 14),
            forecast_demand=Decimal("10"),
            corrected_demand=Decimal("12"),
            justification="Needed",
        )
    assert "serviceDate" in past_error.value.field_errors

    with pytest.raises(OverrideValidationError) as invalid_error:
        validate_demand_override(
            service_date=date(2026, 9, 15),
            today=date(2026, 9, 14),
            forecast_demand=Decimal("10"),
            corrected_demand=Decimal("-1"),
            justification=None,
        )
    assert "correctedDemand" in invalid_error.value.field_errors

    with pytest.raises(OverrideValidationError) as precision_error:
        validate_demand_override(
            service_date=date(2026, 9, 15),
            today=date(2026, 9, 14),
            forecast_demand=Decimal("10"),
            corrected_demand=Decimal("1.234"),
            justification="ok",
        )
    assert "correctedDemand" in precision_error.value.field_errors


def test_validate_demand_override_requires_and_trims_justification() -> None:
    with pytest.raises(OverrideValidationError) as missing_error:
        validate_demand_override(
            service_date=date(2026, 9, 15),
            today=date(2026, 9, 14),
            forecast_demand=Decimal("10"),
            corrected_demand=Decimal("13"),
            justification="   ",
        )
    assert "justification" in missing_error.value.field_errors

    with pytest.raises(OverrideValidationError) as long_error:
        validate_demand_override(
            service_date=date(2026, 9, 15),
            today=date(2026, 9, 14),
            forecast_demand=Decimal("10"),
            corrected_demand=Decimal("10.5"),
            justification="x" * 501,
        )
    assert "justification" in long_error.value.field_errors

    cleaned = validate_demand_override(
        service_date=date(2026, 9, 15),
        today=date(2026, 9, 14),
        forecast_demand=Decimal("10"),
        corrected_demand=Decimal("13"),
        justification="  Two admissions expected  ",
    )
    assert cleaned == "Two admissions expected"
