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

    kalshi_calendar_live_max_events: int = Field(
        default=10,
        ge=1,
        le=200,
        validation_alias="KALSHI_CALENDAR_LIVE_MAX_EVENTS",
        description="Max events returned by GET /calendar-live.",
    )
    kalshi_sports_live_tz: str = Field(
        default="America/New_York",
        validation_alias="KALSHI_SPORTS_LIVE_TZ",
        description="IANA zone for optional same-calendar-day filter on sports endpoint.",
    )
    kalshi_sports_series_prefixes_extra: str = Field(
        default="",
        validation_alias="KALSHI_SPORTS_SERIES_PREFIXES_EXTRA",
        description="Comma-separated extra series ticker prefixes (e.g. KXFOO,KXBAR) for sports classification.",
    )
    kalshi_sports_live_require_today_et: bool = Field(
        default=False,
        validation_alias="KALSHI_SPORTS_LIVE_REQUIRE_TODAY_ET",
        description="If true, sports rows must touch the configured local calendar day (parsed from API times).",
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
