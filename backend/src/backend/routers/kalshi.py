"""Kalshi-signed REST proxies and WebSocket smoke (credentials required)."""

from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException

from backend.kalshi.calendar_live import build_calendar_live_payload, build_sports_calendar_live_payload
from backend.kalshi.http_client import kalshi_get
from backend.kalshi.ws import kalshi_ws_smoke_test
from backend.settings import Settings, get_settings

router = APIRouter(prefix="/kalshi", tags=["kalshi"])


def _require_kalshi_credentials(settings: Settings) -> None:
    if not settings.kalshi_api_key_id.strip() or not settings.kalshi_private_key_pem.strip():
        raise HTTPException(
            status_code=503,
            detail="Kalshi credentials missing: set KALSHI_API_KEY_ID and KALSHI_PRIVATE_KEY_PEM",
        )


def _http_error(exc: httpx.HTTPStatusError) -> HTTPException:
    text = exc.response.text[:4000] if exc.response.text else ""
    return HTTPException(status_code=exc.response.status_code, detail=text or exc.response.reason_phrase)


@router.get("/portfolio/balance")
async def portfolio_balance(
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    """Signed GET to Kalshi ``/portfolio/balance`` (validates REST signing)."""
    _require_kalshi_credentials(settings)
    try:
        r = await kalshi_get(settings, "/portfolio/balance")
        r.raise_for_status()
        return r.json()
    except httpx.HTTPStatusError as e:
        raise _http_error(e) from e
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/markets")
async def markets(
    settings: Settings = Depends(get_settings),
    limit: int | None = None,
    cursor: str | None = None,
    status: str | None = None,
) -> dict[str, Any]:
    """Signed GET to Kalshi ``/markets`` (query params omitted from signature per Kalshi docs)."""
    _require_kalshi_credentials(settings)
    params: dict[str, Any] = {}
    if limit is not None:
        params["limit"] = limit
    if cursor is not None:
        params["cursor"] = cursor
    if status is not None:
        params["status"] = status
    try:
        r = await kalshi_get(settings, "/markets", params=params or None)
        r.raise_for_status()
        return r.json()
    except httpx.HTTPStatusError as e:
        raise _http_error(e) from e
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/calendar-live")
async def calendar_live(
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    """Open + multivariate events (nested markets), scored toward calendar-style LIVE; cap from env."""
    _require_kalshi_credentials(settings)
    try:
        return await build_calendar_live_payload(settings)
    except httpx.HTTPStatusError as e:
        raise _http_error(e) from e
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/calendar-live-sports")
async def calendar_live_sports(
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    """Same payload shape as calendar-live, filtered to sports-only rows; includes parity vs calendar-live top N."""
    _require_kalshi_credentials(settings)
    try:
        return await build_sports_calendar_live_payload(settings)
    except httpx.HTTPStatusError as e:
        raise _http_error(e) from e
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/ws/smoke")
async def ws_smoke(
    settings: Settings = Depends(get_settings),
    wait_seconds: float = 5.0,
) -> dict[str, Any]:
    """Connect to Kalshi WebSocket with signed headers; subscribe to ``ticker``; read one frame."""
    _require_kalshi_credentials(settings)
    try:
        return await kalshi_ws_smoke_test(settings, wait_seconds=wait_seconds)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
