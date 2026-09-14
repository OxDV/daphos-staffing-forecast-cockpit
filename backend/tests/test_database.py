from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy import text

from app.persistence.database import create_db_engine, get_session


def test_create_db_engine_rejects_non_sqlite() -> None:
    with pytest.raises(ValueError, match="Only SQLite"):
        create_db_engine("postgresql+psycopg://localhost/daphos")


def test_create_db_engine_enables_foreign_keys(tmp_path: Path) -> None:
    db_path = tmp_path / "nested" / "staffing.db"
    engine = create_db_engine(f"sqlite:///{db_path}")

    with engine.connect() as connection:
        enabled = connection.execute(text("PRAGMA foreign_keys")).scalar()
        assert enabled == 1

    assert db_path.exists()
    engine.dispose()


def test_get_session_yields_and_closes(tmp_path: Path) -> None:
    engine = create_db_engine(f"sqlite:///{tmp_path / 'session.db'}")
    from app.persistence import database as database_module

    original_session_local = database_module.SessionLocal
    database_module.SessionLocal = database_module.sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        future=True,
    )
    try:
        generator = get_session()
        session = next(generator)
        assert session.is_active
        generator.close()
    finally:
        database_module.SessionLocal = original_session_local
        engine.dispose()


def test_metadata_contains_expected_tables() -> None:
    from app.persistence import models as _models  # noqa: F401
    from app.persistence.database import Base

    table_names = set(Base.metadata.tables)
    assert table_names == {"wards", "staffing_days", "demand_overrides"}
