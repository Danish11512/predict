"""Dev-only HTML hub and sqladmin CRUD shell.

Mounted only when ``Settings.app_env`` lowercased is not ``production`` (see
``APP_ENV`` in ``backend/.env.example``).
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from sqlalchemy import create_engine
from sqladmin import Admin

from backend.settings import Settings

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


def mount_dev_console(app: FastAPI, settings: Settings) -> None:
    if settings.app_env.lower() == "production":
        return

    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Admin(app, engine, base_url="/crud")

    @app.get("/", include_in_schema=False)
    def dev_hub() -> HTMLResponse:
        return HTMLResponse(HUB_HTML)
