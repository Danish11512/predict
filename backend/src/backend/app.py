from contextlib import asynccontextmanager

import httpx
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.dev_console import mount_dev_console
from backend.kalshi.constants import KALSHI_V1_PUBLIC_BASE_URL
from backend.kalshi.http_client import set_kalshi_http_clients
from backend.routers import kalshi as kalshi_router
from backend.settings import Settings, get_settings


@asynccontextmanager
async def _lifespan(app: FastAPI):
    settings = get_settings()
    trade_base = settings.kalshi_rest_base_url.rstrip("/")
    v1_base = KALSHI_V1_PUBLIC_BASE_URL.rstrip("/")
    trade_client = httpx.AsyncClient(base_url=trade_base, timeout=30.0)
    v1_client = httpx.AsyncClient(base_url=v1_base, timeout=30.0)
    set_kalshi_http_clients(trade_client, v1_client)
    yield
    await trade_client.aclose()
    await v1_client.aclose()
    set_kalshi_http_clients(None, None)


def create_app() -> FastAPI:
    settings = get_settings()
    is_prod = settings.app_env.lower() == "production"
    app = FastAPI(
        title="Kalshi integration API",
        version="0.1.0",
        description="Backend for Kalshi REST and WebSocket integration (scaffold only).",
        lifespan=_lifespan,
        docs_url=None if is_prod else "/docs",
        redoc_url=None if is_prod else "/redoc",
        openapi_url=None if is_prod else "/openapi.json",
    )

    origins = [
        part.strip()
        for part in settings.cors_allowed_origins.split(",")
        if part.strip()
    ]
    if origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    @app.get("/health")
    def health(
        config: Settings = Depends(get_settings),
    ) -> dict[str, str | bool]:
        kalshi_ready = bool(
            config.kalshi_api_key_id.strip() and config.kalshi_private_key_pem.strip()
        )
        return {
            "status": "ok",
            "kalshi_credentials_configured": kalshi_ready,
        }

    app.include_router(kalshi_router.router)

    mount_dev_console(app, settings)

    return app


app = create_app()
