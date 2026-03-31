"""Entry point: add backend and backend/src to sys.path, load config, run FastAPI via uvicorn.

`PORT` is the **this service's** HTTP listen port (Predict API), not Kalshi.
Kalshi's site URL is configured separately for the runner (`KALSHI_PUBLIC_URL` / `BASE_URL` in config).
"""
import os
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
_repo_root = _root.parent
_backend_src = _root / "src"
sys.path.insert(0, str(_root))
sys.path.insert(0, str(_backend_src))

if not (_repo_root / ".env").is_file():
    print(
        "Error: Missing .env at repository root. Copy .env.example to .env and set required values.",
        file=sys.stderr,
    )
    sys.exit(1)

import config  # noqa: E402  # loads repo root .env
from app import app  # noqa: E402

if __name__ == "__main__":
    try:
        # FastAPI (this repo) bind port — not the Kalshi website port or hostname.
        port = int(os.environ.get("PORT", "8000"))
    except ValueError:
        port = 8000
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)
