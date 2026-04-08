def serve() -> None:
    import uvicorn

    from backend.settings import get_settings

    settings = get_settings()

    uvicorn.run(
        "backend.app:app",
        host="127.0.0.1",
        port=settings.backend_port,
        reload=True,
    )
