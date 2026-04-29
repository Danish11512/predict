"""Authenticated GET requests to Kalshi REST API."""

from __future__ import annotations

import time
from typing import Any

import httpx

from backend.kalshi.constants import KALSHI_V1_PUBLIC_BASE_URL
from backend.kalshi.signing import load_private_key_from_pem, path_for_request, sign_request
from backend.settings import Settings

_trade_client: httpx.AsyncClient | None = None
_v1_client: httpx.AsyncClient | None = None


def set_kalshi_http_clients(
    trade: httpx.AsyncClient | None,
    v1: httpx.AsyncClient | None,
) -> None:
    """Register pooled clients (FastAPI lifespan); ``None`` clears for tests / scripts."""
    global _trade_client, _v1_client
    _trade_client = trade
    _v1_client = v1


def _auth_headers(settings: Settings, method: str, sign_path: str) -> dict[str, str]:
    ts = str(int(time.time() * 1000))
    key = load_private_key_from_pem(settings.kalshi_private_key_pem.strip())
    sig = sign_request(key, ts, method, sign_path)
    return {
        "KALSHI-ACCESS-KEY": settings.kalshi_api_key_id.strip(),
        "KALSHI-ACCESS-TIMESTAMP": ts,
        "KALSHI-ACCESS-SIGNATURE": sig,
    }


async def kalshi_get(
    settings: Settings,
    path: str,
    *,
    params: dict[str, Any] | None = None,
) -> httpx.Response:
    """Signed GET to ``KALSHI_REST_BASE_URL`` (query string is not part of the sign path)."""
    base = settings.kalshi_rest_base_url.rstrip("/")
    path_only = path.split("?", 1)[0]
    if not path_only.startswith("/"):
        path_only = f"/{path_only}"
    sign_path = path_for_request(base, path_only)
    headers = _auth_headers(settings, "GET", sign_path)
    client = _trade_client
    if client is None:
        async with httpx.AsyncClient(base_url=base, timeout=30.0) as ephemeral:
            return await ephemeral.get(path_only, headers=headers, params=params)
    return await client.get(path_only, headers=headers, params=params)


async def kalshi_v1_get(
    path: str,
    *,
    params: dict[str, Any] | list[tuple[str, str]] | None = None,
) -> httpx.Response:
    """Unauthenticated GET to the Kalshi v1 public API (card_feed, live_data, filters).

    Use a list of ``(key, value)`` tuples when a query key must repeat (e.g. ``milestone_ids`` explode).
    """
    base = KALSHI_V1_PUBLIC_BASE_URL.rstrip("/")
    path_only = path.split("?", 1)[0]
    if not path_only.startswith("/"):
        path_only = f"/{path_only}"
    client = _v1_client
    if client is None:
        async with httpx.AsyncClient(base_url=base, timeout=30.0) as ephemeral:
            return await ephemeral.get(path_only, params=params)
    return await client.get(path_only, params=params)
