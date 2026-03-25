"""Single source for env: load .env from repo root and expose all config."""
from pathlib import Path

from dotenv import load_dotenv
import os

_repo_root = Path(__file__).resolve().parent.parent.parent
load_dotenv(_repo_root / ".env")

base_url: str = os.environ.get("BASE_URL", "https://kalshi.com")
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
