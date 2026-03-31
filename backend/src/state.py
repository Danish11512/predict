"""Shared state: latest payload and SSE subscriber queues (thread-safe)."""
from __future__ import annotations

import asyncio
import queue as queue_module
import threading
import uuid
from dataclasses import dataclass, field
from typing import Union


class ShutdownRequested(Exception):
    """Raised when request_user_input is interrupted by stop_event (e.g. Ctrl+C)."""

latest_payload: dict | None = None
_queues: list[asyncio.Queue] = []
# When a request is enqueued with no connected clients, buffer it for the next client that registers.
_pending_request: "RequestItem | None" = None
# Latest OTP / user-input request still waiting on POST /stream/response — replayed to new SSE clients (e.g. refresh).
_unresolved_request: "RequestItem | None" = None
_lock: threading.Lock = threading.Lock()


@dataclass
class DataItem:
    kind: str = "data"
    payload: dict = field(default_factory=dict)


@dataclass
class RequestItem:
    kind: str = "request"
    request_id: str = ""
    prompt: str = ""
    field_name: str | None = None  # e.g. "code" for 2FA; avoid shadowing dataclasses.field
    response_holder: queue_module.Queue = field(default_factory=queue_module.Queue)


@dataclass
class ProgressItem:
    kind: str = "progress"
    percent: int = 0


@dataclass
class ErrorItem:
    kind: str = "error"
    code: str = "no_games"
    message: str | None = None


QueueItem = Union[DataItem, RequestItem, ProgressItem, ErrorItem]


def register() -> asyncio.Queue:
    global _pending_request
    q: asyncio.Queue = asyncio.Queue()
    with _lock:
        if _pending_request is not None:
            q.put_nowait(_pending_request)
            _pending_request = None
        elif _unresolved_request is not None:
            q.put_nowait(_unresolved_request)
        _queues.append(q)
    return q


def unregister(q: asyncio.Queue) -> None:
    with _lock:
        if q in _queues:
            _queues.remove(q)


def set_latest(payload: dict) -> None:
    global latest_payload
    latest_payload = payload
    item = DataItem(payload=payload)
    with _lock:
        for q in _queues:
            q.put_nowait(item)


def enqueue_progress(percent: int) -> None:
    """Enqueue a progress item to all subscriber queues."""
    item = ProgressItem(percent=percent)
    with _lock:
        for q in _queues:
            q.put_nowait(item)


def enqueue_error(code: str = "no_games", message: str | None = None) -> None:
    """Enqueue an error item to all subscriber queues."""
    item = ErrorItem(code=code, message=message)
    with _lock:
        for q in _queues:
            q.put_nowait(item)


def enqueue_request(prompt: str, field: str | None = None) -> queue_module.Queue:
    """Enqueue a request item to all subscriber queues. Returns the response_holder to block on.
    If no client is connected, the request is buffered and delivered to the next client that registers."""
    global _pending_request, _unresolved_request
    request_id = str(uuid.uuid4())
    response_holder: queue_module.Queue = queue_module.Queue()
    item = RequestItem(request_id=request_id, prompt=prompt, field_name=field, response_holder=response_holder)
    with _lock:
        _unresolved_request = item
        if _queues:
            for q in _queues:
                q.put_nowait(item)
        else:
            _pending_request = item
    return response_holder


def clear_unresolved_if_match(request_id: str) -> None:
    """Clear replay target after a successful POST /stream/response for that id."""
    global _unresolved_request
    with _lock:
        if _unresolved_request is not None and _unresolved_request.request_id == request_id:
            _unresolved_request = None


def request_user_input(
    prompt: str,
    field: str | None = None,
    stop_event: threading.Event | None = None,
) -> str:
    """Request a value from the user via SSE; blocks until POST /stream/response provides it.
    If stop_event is set (e.g. on Ctrl+C), raises ShutdownRequested so the caller can exit and close the driver."""
    response_holder = enqueue_request(prompt, field)
    if stop_event is None:
        return response_holder.get()
    while True:
        if stop_event.is_set():
            raise ShutdownRequested()
        try:
            return response_holder.get(timeout=1.0)
        except queue_module.Empty:
            continue
