from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DAPHOS_")

    app_name: str = "DaphOS Staffing Forecast Cockpit API"
    database_url: str = f"sqlite:///{Path(__file__).resolve().parents[1] / 'data' / 'staffing.db'}"
    cors_origins: list[str] = ["http://localhost:4200", "http://127.0.0.1:4200"]
    audit_user: str = "demo.ward.manager@daphos.test"
    allow_test_reset: bool = False


settings = Settings()
