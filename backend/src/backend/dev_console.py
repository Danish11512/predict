"""Dev-only HTML hub and sqladmin CRUD shell.

Mounted only when ``Settings.app_env`` lowercased is not ``production`` (see
``APP_ENV`` in ``backend/.env.example``).
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections import deque

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy import create_engine
from sqladmin import Admin
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from backend.settings import Settings

_BUFFER_MAX = 200
_request_records: deque[dict[str, object]] = deque(maxlen=_BUFFER_MAX)
_request_lock = asyncio.Lock()


async def _push_record(record: dict[str, object]) -> None:
    async with _request_lock:
        _request_records.appendleft(record)


async def _snapshot_records() -> list[dict[str, object]]:
    async with _request_lock:
        return list(_request_records)


def _http_request_logger() -> logging.Logger:
    log = logging.getLogger("backend.http")
    if not log.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(message)s"))
        log.addHandler(handler)
    log.setLevel(logging.INFO)
    log.propagate = False
    return log


class DevRequestLogMiddleware(BaseHTTPMiddleware):
    """Records each request (except the poll endpoint) to memory and stderr."""

    def __init__(self, app: object, logger: logging.Logger) -> None:
        super().__init__(app)
        self._logger = logger

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        if request.url.path == "/dev/api/requests":
            return await call_next(request)
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        path = request.url.path
        query = request.url.query
        method = request.method
        status = response.status_code
        path_display = f"{path}?{query}" if query else path
        record: dict[str, object] = {
            "method": method,
            "path": path,
            "query": query or None,
            "status": status,
            "duration_ms": duration_ms,
        }
        await _push_record(record)
        self._logger.info(
            "method=%s path=%s status=%s duration_ms=%s",
            method,
            path_display,
            status,
            duration_ms,
        )
        return response

HUB_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Backend dev hub</title>
  <style>
    :root {
      --bg: #0f1419;
      --panel: #1a2332;
      --text: #e7ecf3;
      --muted: #8b9cb3;
      --accent: #5b9fd4;
      --border: #2a3a4d;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      min-height: 100vh;
    }
    header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      background: var(--panel);
    }
    header h1 { margin: 0; font-size: 1.15rem; font-weight: 600; }
    header p { margin: 0.35rem 0 0; color: var(--muted); font-size: 0.9rem; }
    main { padding: 1rem 1.5rem 2rem; max-width: 52rem; scroll-behavior: smooth; }
    nav.hub-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.65rem;
      margin-bottom: 1.25rem;
    }
    nav.hub-tabs a {
      padding: 0.45rem 0.85rem;
      border-radius: 6px;
      color: var(--muted);
      font-size: 0.9rem;
      border: 1px solid transparent;
    }
    nav.hub-tabs a:hover { color: var(--text); background: var(--panel); }
    section.hub-section {
      padding: 0 0 1.5rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 1rem;
    }
    section.hub-section:last-of-type { border-bottom: none; }
    section.hub-section h2 {
      margin: 0 0 0.65rem;
      font-size: 1rem;
      font-weight: 600;
    }
    a {
      color: var(--accent);
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
    ul.links { list-style: none; padding: 0; margin: 0; }
    ul.links li { margin: 0.5rem 0; }
    code { background: var(--panel); padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.88em; }
    .note { color: var(--muted); font-size: 0.9rem; margin-top: 0.75rem; }
  </style>
</head>
<body>
  <header>
    <h1>Backend dev hub</h1>
    <p><code>APP_ENV</code> is not <code>production</code> — docs, admin, and request tools are available.</p>
  </header>
  <main>
    <nav class="hub-tabs" aria-label="Dev hub sections">
      <a href="#hub-home">Home</a>
      <a href="#hub-api">API &amp; OpenAPI</a>
      <a href="#hub-crud">Admin (CRUD)</a>
      <a href="#hub-live">Live requests</a>
    </nav>
    <section class="hub-section" id="hub-home">
      <h2>Home</h2>
      <p>Quick links:</p>
      <ul class="links">
        <li><a href="/health"><code>GET /health</code></a> — health + Kalshi credential flag</li>
        <li><a href="/docs">Swagger UI</a> (<code>/docs</code>)</li>
        <li><a href="/redoc">ReDoc</a> (<code>/redoc</code>)</li>
        <li><a href="/openapi.json">OpenAPI JSON</a></li>
        <li><a href="/crud">sqladmin</a> (<code>/crud</code>) — add SQLAlchemy models to enable tables</li>
        <li><a href="/dev/requests">Live request log</a> (<code>/dev/requests</code>)</li>
      </ul>
    </section>
    <section class="hub-section" id="hub-api">
      <h2>API &amp; OpenAPI</h2>
      <ul class="links">
        <li><a href="/docs">Swagger UI</a></li>
        <li><a href="/redoc">ReDoc</a></li>
        <li><a href="/openapi.json">OpenAPI schema (JSON)</a></li>
      </ul>
      <p class="note">With <code>APP_ENV=production</code>, browser OpenAPI UIs and this hub are disabled.</p>
    </section>
    <section class="hub-section" id="hub-crud">
      <h2>Admin (CRUD)</h2>
      <p><strong>sqladmin</strong> is mounted at <a href="/crud"><code>/crud</code></a>. No models are registered yet; register <code>ModelView</code> classes when you add SQLAlchemy models.</p>
    </section>
    <section class="hub-section" id="hub-live">
      <h2>Live requests</h2>
      <p>Open the <a href="/dev/requests">live request log</a> (in-memory, dev only).</p>
      <p class="note">JSON: <a href="/dev/api/requests"><code>GET /dev/api/requests</code></a></p>
    </section>
  </main>
</body>
</html>
"""

REQUESTS_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Live requests</title>
  <style>
    :root { --bg: #0f1419; --panel: #1a2332; --text: #e7ecf3; --muted: #8b9cb3; --accent: #5b9fd4; --border: #2a3a4d; }
    body { margin: 0; font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 1rem 1.25rem; }
    h1 { font-size: 1.1rem; margin: 0 0 0.75rem; }
    p { color: var(--muted); font-size: 0.88rem; margin: 0 0 1rem; }
    a { color: var(--accent); }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { text-align: left; padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    th { color: var(--muted); font-weight: 600; }
    tbody tr:hover { background: var(--panel); }
    code { font-size: 0.92em; }
  </style>
</head>
<body>
  <h1>Live requests</h1>
  <p>Polls <code>/dev/api/requests</code> every 1.5s. <a href="/">Dev hub</a></p>
  <table>
    <thead><tr><th>Time</th><th>Method</th><th>Path</th><th>Status</th><th>ms</th></tr></thead>
    <tbody id="rows"></tbody>
  </table>
  <script>
    const tbody = document.getElementById("rows");
    function td(text) {
      const el = document.createElement("td");
      el.textContent = text;
      return el;
    }
    function refresh() {
      fetch("/dev/api/requests")
        .then((r) => r.json())
        .then((data) => {
          const stamp = new Date().toISOString().split("T")[1].slice(0, 8);
          tbody.replaceChildren();
          for (const row of data) {
            const tr = document.createElement("tr");
            tr.appendChild(td(stamp));
            tr.appendChild(td(row.method));
            const pathTd = document.createElement("td");
            const code = document.createElement("code");
            code.textContent = row.path + (row.query ? "?" + row.query : "");
            pathTd.appendChild(code);
            tr.appendChild(pathTd);
            tr.appendChild(td(String(row.status)));
            tr.appendChild(td(String(row.duration_ms)));
            tbody.appendChild(tr);
          }
        })
        .catch(() => {
          tbody.replaceChildren();
          const tr = document.createElement("tr");
          const err = document.createElement("td");
          err.colSpan = 5;
          err.textContent = "Failed to load";
          tr.appendChild(err);
          tbody.appendChild(tr);
        });
    }
    setInterval(refresh, 1500);
    refresh();
  </script>
</body>
</html>
"""


def mount_dev_console(app: FastAPI, settings: Settings) -> None:
    if settings.app_env.lower() == "production":
        return

    http_logger = _http_request_logger()
    app.add_middleware(DevRequestLogMiddleware, logger=http_logger)

    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Admin(app, engine, base_url="/crud")

    @app.get("/", include_in_schema=False)
    def dev_hub() -> HTMLResponse:
        return HTMLResponse(HUB_HTML)

    @app.get("/dev/api/requests", include_in_schema=False)
    async def dev_request_log_json() -> JSONResponse:
        rows = await _snapshot_records()
        return JSONResponse(content=rows)

    @app.get("/dev/requests", include_in_schema=False)
    def dev_request_log_page() -> HTMLResponse:
        return HTMLResponse(REQUESTS_HTML)
