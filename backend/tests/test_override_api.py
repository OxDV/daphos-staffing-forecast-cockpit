from __future__ import annotations

from collections.abc import Generator
from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.staffing import get_db_session
from app.config import settings
from app.main import app
from app.persistence.models import Ward
from app.seed import seed_database
from app.services.staffing_service import create_demand_override, get_override_history


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


def _ward_id(session: Session, code: str = "B3") -> str:
    ward = session.scalar(select(Ward).where(Ward.code == code))
    assert ward is not None
    return str(ward.id)


def test_create_override_persists_audit_and_updates_summary(
    client: TestClient,
    seeded_session: Session,
) -> None:
    ward_id = _ward_id(seeded_session)
    service_date = "2026-09-16"

    response = client.post(
        f"/api/v1/wards/{ward_id}/staffing-days/{service_date}/overrides",
        json={
            "correctedDemand": 20,
            "justification": "Two additional high-acuity admissions expected",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["override"]["correctedBy"] == settings.audit_user
    assert payload["override"]["correctedDemand"] == 20
    assert payload["day"]["effectiveDemand"] == 20
    assert payload["day"]["isCorrected"] is True
    assert payload["summary"]["manualCorrectionCount"] >= 1

    history = client.get(f"/api/v1/wards/{ward_id}/staffing-days/{service_date}/overrides")
    assert history.status_code == 200
    items = history.json()["items"]
    assert len(items) >= 1
    assert items[0]["justification"] == "Two additional high-acuity admissions expected"


def test_create_override_rejects_past_day_and_missing_justification(
    client: TestClient,
    seeded_session: Session,
) -> None:
    ward_id = _ward_id(seeded_session)

    past = client.post(
        f"/api/v1/wards/{ward_id}/staffing-days/2026-09-10/overrides",
        json={"correctedDemand": 20, "justification": "Too late"},
    )
    assert past.status_code == 422
    assert past.json()["fieldErrors"]["serviceDate"]

    missing = client.post(
        f"/api/v1/wards/{ward_id}/staffing-days/2026-09-17/overrides",
        json={"correctedDemand": 30, "justification": ""},
    )
    assert missing.status_code == 422
    assert "justification" in missing.json()["fieldErrors"]


def test_second_override_keeps_history(
    seeded_session: Session,
    fixed_today: date,
) -> None:
    ward = seeded_session.scalar(select(Ward).where(Ward.code == "B3"))
    assert ward is not None

    first = create_demand_override(
        seeded_session,
        ward_id=ward.id,
        service_date=date(2026, 9, 18),
        corrected_demand=Decimal(15),
        justification="First correction",
        today=fixed_today,
        now=datetime(2026, 9, 14, 9, 0, tzinfo=UTC),
    )
    second = create_demand_override(
        seeded_session,
        ward_id=ward.id,
        service_date=date(2026, 9, 18),
        corrected_demand=Decimal(16),
        justification="Second correction",
        today=fixed_today,
        now=datetime(2026, 9, 14, 10, 0, tzinfo=UTC),
    )

    history = get_override_history(
        seeded_session,
        ward_id=ward.id,
        service_date=date(2026, 9, 18),
    )
    assert len(history.items) >= 2
    assert history.items[0].corrected_demand == Decimal(16)
    assert first.day.forecast_demand == second.day.forecast_demand
    assert second.summary.manual_correction_count >= 2


def test_delete_override_restores_effective_demand(
    client: TestClient,
    seeded_session: Session,
) -> None:
    ward_id = _ward_id(seeded_session)
    service_date = "2026-09-16"

    created = client.post(
        f"/api/v1/wards/{ward_id}/staffing-days/{service_date}/overrides",
        json={
            "correctedDemand": 20,
            "justification": "Temporary surge expected",
        },
    )
    assert created.status_code == 201
    override_id = created.json()["override"]["id"]
    forecast = created.json()["day"]["forecastDemand"]

    deleted = client.delete(
        f"/api/v1/wards/{ward_id}/staffing-days/{service_date}/overrides/{override_id}"
    )
    assert deleted.status_code == 200
    payload = deleted.json()
    assert payload["day"]["effectiveDemand"] == forecast
    assert payload["day"]["isCorrected"] is False

    history = client.get(f"/api/v1/wards/{ward_id}/staffing-days/{service_date}/overrides")
    assert history.status_code == 200
    assert all(item["id"] != override_id for item in history.json()["items"])


def test_delete_override_rejects_past_day_and_unknown_id(
    client: TestClient,
    seeded_session: Session,
) -> None:
    ward_id = _ward_id(seeded_session)
    unknown = client.delete(
        f"/api/v1/wards/{ward_id}/staffing-days/2026-09-16/overrides/{uuid4()}"
    )
    assert unknown.status_code == 404

    past_delete = client.delete(
        f"/api/v1/wards/{ward_id}/staffing-days/2026-09-10/overrides/{uuid4()}"
    )
    assert past_delete.status_code == 422
    assert past_delete.json()["fieldErrors"]["serviceDate"]


def test_override_endpoints_return_404_for_unknown_resources(client: TestClient) -> None:
    missing_ward = client.post(
        f"/api/v1/wards/{uuid4()}/staffing-days/2026-09-16/overrides",
        json={"correctedDemand": 12, "justification": "Needed for coverage"},
    )
    assert missing_ward.status_code == 404

    week = client.get("/api/v1/staffing-weeks", params={"weekStart": "2026-09-14"})
    ward_id = week.json()["wards"][0]["id"]
    missing_day = client.get(f"/api/v1/wards/{ward_id}/staffing-days/2099-01-01/overrides")
    assert missing_day.status_code == 404
