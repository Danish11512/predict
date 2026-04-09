from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.dev_console import mount_dev_console
from backend.routers import kalshi as kalshi_router
from backend.settings import Settings, get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    is_prod = settings.app_env.lower() == "production"
    app = FastAPI(
        title="Kalshi integration API",
        version="0.1.0",
        description="Backend for Kalshi REST and WebSocket integration (scaffold only).",
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
