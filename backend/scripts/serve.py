"""Entry point: add backend and backend/src to sys.path, load config, run FastAPI via uvicorn."""
import os
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
_backend_src = _root / "src"
sys.path.insert(0, str(_root))
sys.path.insert(0, str(_backend_src))

import config  # noqa: E402  # loads repo root .env
from app import app  # noqa: E402

if __name__ == "__main__":
    try:
        port = int(os.environ.get("PORT", "8000"))
    except ValueError:
        port = 8000
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=port, reload=False)
