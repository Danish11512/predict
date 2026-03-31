"""Predict **local API** (this uvicorn process): `/live-games`, `/stream`, `/stream/response`.

Browser automation uses **Kalshi's public site** (`KALSHI_PUBLIC_URL` / `config.kalshi_public_url`), not these URLs.
"""
from __future__ import annotations

import asyncio
import json
import threading
from typing import Any

from pydantic import BaseModel

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

import state
from state import DataItem, RequestItem, ProgressItem, ErrorItem
import runner

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# request_id -> (future, response_holder) for request/response flow
_request_map: dict[str, tuple[asyncio.Future[None], Any]] = {}
_request_map_lock = asyncio.Lock()

_runner_stop = threading.Event()
_runner_thread: threading.Thread | None = None


class StreamResponseBody(BaseModel):
    request_id: str
    value: str


@app.on_event("startup")
def startup() -> None:
    global _runner_thread
    _runner_stop.clear()
    _runner_thread = threading.Thread(target=_run_runner, daemon=True)
    _runner_thread.start()


@app.on_event("shutdown")
def shutdown() -> None:
    _runner_stop.set()
    if _runner_thread is not None:
        _runner_thread.join(timeout=15.0)


def _run_runner() -> None:
    runner.run(on_payload=state.set_latest, stop_event=_runner_stop)


@app.get("/live-games")
def get_live_games() -> dict:
    if state.latest_payload is None:
        return {"updated_utc": None, "games": []}
    return state.latest_payload


@app.get("/stream")
async def stream() -> StreamingResponse:
    queue = state.register()

    async def event_gen() -> None:
        try:
            if state.latest_payload is not None:
                yield f"event: data\ndata: {json.dumps(state.latest_payload)}\n\n"
            while True:
                try:
                    item: state.QueueItem = await asyncio.wait_for(queue.get(), timeout=30.0)
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
                    continue
                if isinstance(item, DataItem):
                    yield f"event: data\ndata: {json.dumps(item.payload)}\n\n"
                elif isinstance(item, RequestItem):
                    loop = asyncio.get_running_loop()
                    future: asyncio.Future[None] = loop.create_future()
                    async with _request_map_lock:
                        _request_map[item.request_id] = (future, item.response_holder)
                    request_data = {
                        "request_id": item.request_id,
                        "prompt": item.prompt,
                        "field": item.field_name,
                    }
                    try:
                        yield f"event: request\ndata: {json.dumps(request_data)}\n\n"
                        await future
                    except asyncio.CancelledError:
                        raise
                    finally:
                        async with _request_map_lock:
                            entry = _request_map.pop(item.request_id, None)
                        if entry is not None:
                            fut, _ = entry
                            if not fut.done():
                                fut.cancel()
                elif isinstance(item, ProgressItem):
                    yield f"event: progress\ndata: {json.dumps({'percent': item.percent})}\n\n"
                elif isinstance(item, ErrorItem):
                    yield f"event: error\ndata: {json.dumps({'code': item.code, 'message': item.message or ''})}\n\n"
                else:
                    raise TypeError(f"Unexpected queue item: {type(item)}")
        finally:
            state.unregister(queue)

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
    )


@app.post("/stream/response")
async def stream_response(body: StreamResponseBody) -> dict:
    """Accept user input for a pending request; unblocks the stream generator and runner."""
    async with _request_map_lock:
        entry = _request_map.get(body.request_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Unknown request_id")
    future, response_holder = entry
    if not future.done():
        future.set_result(None)
    await asyncio.to_thread(response_holder.put, body.value)
    state.clear_unresolved_if_match(body.request_id)
    return {"ok": True}
