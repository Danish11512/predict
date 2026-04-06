"""HTTP client for Kalshi Trade API v2 (read-only JSON). Uses stdlib only."""
from __future__ import annotations

import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

LOG = logging.getLogger(__name__)


def _sleep_retry_after(headers: Any, attempt: int) -> None:
    """Sleep from Retry-After header (seconds) or exponential backoff."""
    ra = headers.get("Retry-After") if headers is not None else None
    if ra is not None:
        try:
            time.sleep(min(60.0, float(ra)))
            return
        except (TypeError, ValueError):
            pass
    time.sleep(min(30.0, 0.5 * (2**attempt)))


def get_json(
    path: str,
    *,
    base_url: str,
    timeout_sec: float = 15.0,
    max_attempts: int = 4,
) -> tuple[int, Any | None]:
    """
    GET path relative to base (path must start with /). Returns (status_code, parsed_json_or_none).
    On 429, honors Retry-After when present, else exponential backoff, then retries.
    """
    base = base_url.rstrip("/")
    if not path.startswith("/"):
        path = "/" + path
    url = base + path
    last_err: Exception | None = None
    for attempt in range(max_attempts):
        req = urllib.request.Request(url, headers={"Accept": "application/json"}, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                raw = resp.read()
                if not raw:
                    return resp.status, None
                return resp.status, json.loads(raw.decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            if e.code == 429:
                LOG.warning("Kalshi Trade API 429 for %s: %s", url, body[:200])
                _sleep_retry_after(e.headers, attempt)
                last_err = e
                continue
            if e.code == 404:
                LOG.info("Kalshi Trade API 404 for %s", url)
                return 404, None
            LOG.warning("Kalshi Trade API HTTP %s for %s: %s", e.code, url, body[:300])
            return e.code, None
        except urllib.error.URLError as e:
            LOG.warning("Kalshi Trade API network error for %s: %s", url, e)
            last_err = e
            _sleep_retry_after({}, attempt)
        except json.JSONDecodeError as e:
            LOG.warning("Kalshi Trade API invalid JSON from %s: %s", url, e)
            return 502, None
    if last_err is not None:
        LOG.warning("Kalshi Trade API gave up after retries: %s (%s)", url, last_err)
    return 599, None


def fetch_event_with_nested_markets(
    event_ticker: str,
    *,
    base_url: str,
    timeout_sec: float,
    max_attempts: int,
) -> dict[str, Any] | None:
    """Return the event object from GET /events/{ticker}?with_nested_markets=true, or None."""
    enc = urllib.parse.quote(event_ticker, safe="")
    q = urllib.parse.urlencode({"with_nested_markets": "true"})
    path = f"/events/{enc}?{q}"
    status, data = get_json(path, base_url=base_url, timeout_sec=timeout_sec, max_attempts=max_attempts)
    if status != 200 or not isinstance(data, dict):
        return None
    ev = data.get("event")
    return ev if isinstance(ev, dict) else None
