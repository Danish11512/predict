from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.dev_console import mount_dev_console
from backend.settings import Settings, get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Kalshi integration API",
        version="0.1.0",
        description="Backend for Kalshi REST and WebSocket integration (scaffold only).",
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

    mount_dev_console(app, settings)

    return app


app = create_app()
