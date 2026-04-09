"""Kalshi WebSocket: same auth headers as REST; sign ``GET`` + path from WS URL."""

from __future__ import annotations

import asyncio
import json
import time
from typing import Any

import websockets

from backend.kalshi.signing import load_private_key_from_pem, sign_request, websocket_sign_path
from backend.settings import Settings


def _ws_headers(settings: Settings) -> dict[str, str]:
    ts = str(int(time.time() * 1000))
    path = websocket_sign_path(settings.kalshi_ws_url)
    key = load_private_key_from_pem(settings.kalshi_private_key_pem.strip())
    sig = sign_request(key, ts, "GET", path)
    return {
        "KALSHI-ACCESS-KEY": settings.kalshi_api_key_id.strip(),
        "KALSHI-ACCESS-TIMESTAMP": ts,
        "KALSHI-ACCESS-SIGNATURE": sig,
    }


async def kalshi_ws_smoke_test(
    settings: Settings,
    *,
    wait_seconds: float = 5.0,
) -> dict[str, Any]:
    """Connect, subscribe to ``ticker``, return first text frame or timeout info."""
    headers = _ws_headers(settings)
    uri = settings.kalshi_ws_url.strip()
    subscribe = json.dumps(
        {
            "id": 1,
            "cmd": "subscribe",
            "params": {"channels": ["ticker"]},
        }
    )

    async with websockets.connect(uri, additional_headers=headers) as websocket:
        await websocket.send(subscribe)
        first: str | None = None
        try:
            raw = await asyncio.wait_for(websocket.recv(), timeout=wait_seconds)
        except TimeoutError:
            return {
                "ok": True,
                "connected": True,
                "note": f"No message within {wait_seconds}s (connection OK)",
            }
        if isinstance(raw, bytes):
            first = raw.decode("utf-8", errors="replace")
        else:
            first = raw
        return {
            "ok": True,
            "connected": True,
            "first_message_preview": first[:2000],
        }
