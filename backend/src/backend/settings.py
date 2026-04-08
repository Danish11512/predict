"""Application settings loaded from the environment (see ``backend/.env.example``).

``APP_ENV`` controls whether dev-only surfaces are mounted (hub at ``/``, sqladmin at
``/crud``, ``/dev/*`` request tools). Use ``production`` for deployments; any other
value (e.g. ``development``) enables those routes. Match ``run.sh``, which treats only
``production`` as non-dev for port cleanup.
"""

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = Field(
        default="development",
        validation_alias="APP_ENV",
        description="Set to production to disable dev-only UI, OpenAPI browser UIs, and request tracing.",
    )
    backend_port: int = Field(
        default=8000,
        validation_alias="BACKEND_PORT",
    )
    frontend_port: int = Field(
        default=5173,
        validation_alias="FRONTEND_PORT",
    )

    kalshi_api_key_id: str = Field(
        default="",
        validation_alias="KALSHI_API_KEY_ID",
    )
    kalshi_private_key_pem: str = Field(
        default="",
        validation_alias="KALSHI_PRIVATE_KEY_PEM",
    )
    kalshi_rest_base_url: str = Field(
        default="https://api.elections.kalshi.com/trade-api/v2",
        validation_alias="KALSHI_REST_BASE_URL",
    )
    kalshi_ws_url: str = Field(
        default="wss://api.elections.kalshi.com/trade-api/ws/v2",
        validation_alias="KALSHI_WS_URL",
    )
    cors_allowed_origins: str = Field(
        default="",
        validation_alias="CORS_ALLOWED_ORIGINS",
    )

    @field_validator("kalshi_private_key_pem", mode="before")
    @classmethod
    def expand_pem_newlines(cls, value: object) -> object:
        if isinstance(value, str) and "\\n" in value:
            return value.replace("\\n", "\n")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
