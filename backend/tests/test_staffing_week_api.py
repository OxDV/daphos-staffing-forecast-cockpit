from __future__ import annotations

from collections.abc import Generator
from datetime import date, datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.staffing import get_db_session
from app.main import app
from app.persistence.models import StaffingDay, Ward
from app.seed import seed_database
from app.services.staffing_service import current_date_in_timezone, get_staffing_week


@pytest.fixture()
def seeded_session(session: Session, fixed_today: date) -> Session:
    seed_database(session, today=fixed_today)
    return session


@pytest.fixture()
def client(seeded_session: Session) -> Generator[TestClient, None, None]:
    def override_db() -> Generator[Session, None, None]:
        yield seeded_session

    app.dependency_overrides[get_db_session] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_api_get_db_session_delegates_to_persistence(
    monkeypatch: pytest.MonkeyPatch,
    seeded_session: Session,
) -> None:
    def fake_get_session() -> Generator[Session, None, None]:
        yield seeded_session

    monkeypatch.setattr("app.api.staffing.get_session", fake_get_session)
    generator = get_db_session()
    assert next(generator) is seeded_session
    generator.close()


def test_staffing_week_endpoint_returns_camel_case_payload(
    client: TestClient,
    fixed_today: date,
) -> None:
    response = client.get("/api/v1/staffing-weeks", params={"weekStart": "2026-09-14"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["weekStart"] == "2026-09-14"
    assert payload["weekEnd"] == "2026-09-20"
    assert payload["today"] == fixed_today.isoformat()
    assert payload["overridePolicy"] == {
        "absoluteJustificationThreshold": 2.0,
        "relativeJustificationThreshold": 0.2,
    }
    assert len(payload["wards"]) == 3
    assert [ward["code"] for ward in payload["wards"]] == ["A2", "B3", "ICU"]

    b3 = next(ward for ward in payload["wards"] if ward["code"] == "B3")
    assert len(b3["days"]) == 7
    assert [day["date"] for day in b3["days"]] == [
        "2026-09-14",
        "2026-09-15",
        "2026-09-16",
        "2026-09-17",
        "2026-09-18",
        "2026-09-19",
        "2026-09-20",
    ]
    assert "summary" in b3
    assert "totalUnderstaffing" in b3["summary"]
    assert "manualCorrectionCount" in b3["summary"]
    assert "averageAbsoluteDeviation" in b3["summary"]


def test_staffing_week_rejects_non_monday(client: TestClient) -> None:
    response = client.get("/api/v1/staffing-weeks", params={"weekStart": "2026-09-15"})

    assert response.status_code == 400
    payload = response.json()
    assert payload["type"] == "invalid-week-start"
    assert "Monday" in payload["detail"]


def test_staffing_week_marks_past_days_as_not_overridable(
    seeded_session: Session,
    fixed_today: date,
) -> None:
    result = get_staffing_week(
        seeded_session,
        week_start=date(2026, 9, 7),
        today=fixed_today,
    )
    past_week = result.wards[0]
    assert all(day.can_override is False for day in past_week.days)


def test_staffing_week_applies_seeded_override_to_effective_demand(
    seeded_session: Session,
    fixed_today: date,
) -> None:
    result = get_staffing_week(
        seeded_session,
        week_start=date(2026, 9, 14),
        today=fixed_today,
    )
    b3 = next(ward for ward in result.wards if ward.code == "B3")
    corrected_days = [day for day in b3.days if day.is_corrected]

    assert corrected_days
    assert b3.summary.manual_correction_count >= 1
    assert b3.summary.average_absolute_deviation is not None
    for day in corrected_days:
        assert day.effective_demand != day.forecast_demand
        assert day.can_override is True


def test_staffing_week_skips_wards_without_days_in_range(
    session: Session,
    fixed_today: date,
) -> None:
    ward = Ward(code="EMPTY", name="Empty Ward", timezone="Europe/Berlin")
    session.add(ward)
    session.commit()

    result = get_staffing_week(session, week_start=fixed_today, today=fixed_today)
    assert result.wards == []


def test_staffing_week_summary_null_average_without_overrides(
    session: Session,
    fixed_today: date,
) -> None:
    ward = Ward(code="B3", name="Ward B3", timezone="Europe/Berlin")
    session.add(ward)
    session.flush()
    for offset in range(7):
        service_date = date(2026, 9, 14 + offset)
        session.add(
            StaffingDay(
                ward_id=ward.id,
                service_date=service_date,
                forecast_demand=10,
                planned_staffing=10,
                confidence=0.8,
            )
        )
    session.commit()

    result = get_staffing_week(session, week_start=fixed_today, today=fixed_today)
    assert len(result.wards) == 1
    assert result.wards[0].summary.manual_correction_count == 0
    assert result.wards[0].summary.average_absolute_deviation is None


def test_current_date_in_timezone_converts_naive_utc() -> None:
    moment = datetime(2026, 9, 14, 22, 30)
    assert current_date_in_timezone("Europe/Berlin", now=moment) == date(2026, 9, 15)
