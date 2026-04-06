"""Single source for env: load .env from repo root and expose all config.

URL-related variables fall into two buckets:

1. **Kalshi public site** — the live Kalshi web app the Selenium driver navigates
   (`kalshi_public_url` from `KALSHI_PUBLIC_URL`, or legacy `BASE_URL`). This is never
   the same thing as our API server.

2. **This repo's FastAPI server** — listen port `PORT` (see `scripts/serve.py`).
   The Svelte app uses `PUBLIC_API_BASE_URL` in the *frontend* env to reach that server;
   the backend code does not read `PUBLIC_API_BASE_URL`.
"""
from pathlib import Path

from dotenv import load_dotenv
import os

_repo_root = Path(__file__).resolve().parent.parent.parent
load_dotenv(_repo_root / ".env")

# Kalshi website root (e.g. https://kalshi.com). Used by runner/auth/sports navigation only.
_kalshi = (os.environ.get("KALSHI_PUBLIC_URL") or os.environ.get("BASE_URL") or "").strip()
kalshi_public_url: str = _kalshi if _kalshi else "https://kalshi.com"

email: str = os.environ.get("KALSHI_EMAIL", "")
password: str = os.environ.get("KALSHI_PASSWORD", "")

_env = (os.environ.get("ENV") or "").strip().lower()
is_headless: bool = _env == "prod"

_is_container = (os.environ.get("IS_CONTAINER") or "").strip().lower()
is_container: bool = _is_container in ("1", "true", "yes")

_raw_latency = os.environ.get("LATENCY_MS", "0")
try:
    _ms = float(_raw_latency)
    latency_ms: float = max(0.0, min(30000.0, _ms))
except (TypeError, ValueError):
    latency_ms = 0.0

_raw_verify = os.environ.get("VERIFY_WAIT_TIMEOUT", "120")
try:
    verify_wait_timeout: int = max(10, int(_raw_verify))
except (TypeError, ValueError):
    verify_wait_timeout = 120

_raw_poll = os.environ.get("LIVE_GAMES_POLL_SEC", "5")
try:
    _sec = float(_raw_poll)
    live_games_poll_sec: float = max(1.0, min(60.0, _sec))
except (TypeError, ValueError):
    live_games_poll_sec = 5.0

_trade_base = (os.environ.get("KALSHI_TRADE_API_BASE") or "").strip()
kalshi_trade_api_base: str = (
    _trade_base if _trade_base else "https://api.elections.kalshi.com/trade-api/v2"
)

_raw_trade_timeout = os.environ.get("KALSHI_TRADE_TIMEOUT_SEC", "15")
try:
    kalshi_trade_timeout_sec: float = max(3.0, min(60.0, float(_raw_trade_timeout)))
except (TypeError, ValueError):
    kalshi_trade_timeout_sec = 15.0

_raw_trade_workers = os.environ.get("KALSHI_TRADE_MAX_CONCURRENT", "4")
try:
    kalshi_trade_max_concurrent: int = max(1, min(16, int(_raw_trade_workers)))
except (TypeError, ValueError):
    kalshi_trade_max_concurrent = 4

_raw_trade_retries = os.environ.get("KALSHI_TRADE_MAX_ATTEMPTS", "4")
try:
    kalshi_trade_max_attempts: int = max(1, min(10, int(_raw_trade_retries)))
except (TypeError, ValueError):
    kalshi_trade_max_attempts = 4
