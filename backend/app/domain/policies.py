from __future__ import annotations

from datetime import date
from decimal import Decimal

ABSOLUTE_JUSTIFICATION_THRESHOLD = Decimal("2.00")
RELATIVE_JUSTIFICATION_THRESHOLD = Decimal("0.20")


def can_override(*, service_date: date, today: date) -> bool:
    return service_date >= today
