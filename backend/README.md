# Backend

FastAPI app plus a Selenium runner that logs into **Kalshi’s website** and scrapes live sports tiles.

## Which URL is which

| Variable | Meaning |
|----------|---------|
| `KALSHI_PUBLIC_URL` (or legacy `BASE_URL`) | **Kalshi** site root opened in Chrome by the runner (`config.kalshi_public_url`). |
| `PORT` | **This service’s** HTTP port (uvicorn for `/live-games`, `/stream`, …). |
| `PUBLIC_API_BASE_URL` | Read by the **frontend** `.env` only: browser origin for that same FastAPI server. Not Kalshi. |

`backend/src/config.py` documents the split in its module docstring.
