"""Kalshi-signed REST proxies and WebSocket smoke (credentials required)."""

from __future__ import annotations

import logging
from typing import Any
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, HTTPException

from backend.kalshi.calendar_live import build_sports_calendar_live_payload
from backend.kalshi.http_client import kalshi_get
from backend.kalshi.ws import kalshi_ws_smoke_test
from backend.settings import Settings, get_settings

router = APIRouter(tags=["kalshi"])
_log = logging.getLogger(__name__)


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
        _log.warning("Kalshi portfolio_balance HTTP error", exc_info=True)
        raise _http_error(e) from e
    except httpx.RequestError as e:
        _log.warning("Kalshi portfolio_balance request failed: %s", e, exc_info=True)
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
        _log.warning("Kalshi markets HTTP error", exc_info=True)
        raise _http_error(e) from e
    except httpx.RequestError as e:
        _log.warning("Kalshi markets request failed: %s", e, exc_info=True)
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/portfolio/settlements")
async def portfolio_settlements(
    settings: Settings = Depends(get_settings),
    limit: int | None = None,
    cursor: str | None = None,
    ticker: str | None = None,
    event_ticker: str | None = None,
    min_ts: int | None = None,
    max_ts: int | None = None,
    subaccount: int | None = None,
) -> dict[str, Any]:
    """Signed GET to Kalshi ``/portfolio/settlements``."""
    _require_kalshi_credentials(settings)
    params: dict[str, Any] = {}
    if limit is not None:
        params["limit"] = limit
    if cursor is not None:
        params["cursor"] = cursor
    if ticker is not None:
        params["ticker"] = ticker
    if event_ticker is not None:
        params["event_ticker"] = event_ticker
    if min_ts is not None:
        params["min_ts"] = min_ts
    if max_ts is not None:
        params["max_ts"] = max_ts
    if subaccount is not None:
        params["subaccount"] = subaccount
    try:
        r = await kalshi_get(settings, "/portfolio/settlements", params=params or None)
        r.raise_for_status()
        return r.json()
    except httpx.HTTPStatusError as e:
        _log.warning("Kalshi portfolio_settlements HTTP error", exc_info=True)
        raise _http_error(e) from e
    except httpx.RequestError as e:
        _log.warning("Kalshi portfolio_settlements request failed: %s", e, exc_info=True)
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/portfolio/fills")
async def portfolio_fills(
    settings: Settings = Depends(get_settings),
    limit: int | None = None,
    cursor: str | None = None,
    ticker: str | None = None,
    order_id: str | None = None,
    min_ts: int | None = None,
    max_ts: int | None = None,
    subaccount: int | None = None,
) -> dict[str, Any]:
    """Signed GET to Kalshi ``/portfolio/fills``."""
    _require_kalshi_credentials(settings)
    params: dict[str, Any] = {}
    if limit is not None:
        params["limit"] = limit
    if cursor is not None:
        params["cursor"] = cursor
    if ticker is not None:
        params["ticker"] = ticker
    if order_id is not None:
        params["order_id"] = order_id
    if min_ts is not None:
        params["min_ts"] = min_ts
    if max_ts is not None:
        params["max_ts"] = max_ts
    if subaccount is not None:
        params["subaccount"] = subaccount
    try:
        r = await kalshi_get(settings, "/portfolio/fills", params=params or None)
        r.raise_for_status()
        return r.json()
    except httpx.HTTPStatusError as e:
        _log.warning("Kalshi portfolio_fills HTTP error", exc_info=True)
        raise _http_error(e) from e
    except httpx.RequestError as e:
        _log.warning("Kalshi portfolio_fills request failed: %s", e, exc_info=True)
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/events/{event_ticker}")
async def event_by_ticker(
    event_ticker: str,
    settings: Settings = Depends(get_settings),
    with_nested_markets: bool | None = None,
) -> dict[str, Any]:
    """Signed GET to Kalshi ``/events/{event_ticker}``."""
    _require_kalshi_credentials(settings)
    enc = quote(event_ticker, safe="-_.~")
    path = f"/events/{enc}"
    params: dict[str, Any] = {}
    if with_nested_markets is not None:
        params["with_nested_markets"] = with_nested_markets
    try:
        r = await kalshi_get(settings, path, params=params or None)
        r.raise_for_status()
        return r.json()
    except httpx.HTTPStatusError as e:
        _log.warning("Kalshi event_by_ticker HTTP error", exc_info=True)
        raise _http_error(e) from e
    except httpx.RequestError as e:
        _log.warning("Kalshi event_by_ticker request failed: %s", e, exc_info=True)
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get("/calendar-live")
async def calendar_live(
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    """Sports LIVE calendar — ``card_feed`` (kalshi.com/calendar) with aggregation fallback."""
    _require_kalshi_credentials(settings)
    try:
        return await build_sports_calendar_live_payload(settings)
    except httpx.HTTPStatusError as e:
        _log.warning("calendar-live HTTP error", exc_info=True)
        raise _http_error(e) from e
    except httpx.RequestError as e:
        _log.warning("calendar-live request failed: %s", e, exc_info=True)
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
        _log.exception("Kalshi WebSocket smoke failed")
        raise HTTPException(status_code=502, detail=str(e)) from e
