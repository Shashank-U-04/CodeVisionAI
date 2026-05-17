"""
In-memory session registry for the input-request handshake.

Each active execution gets a unique session_id. When the tracer needs stdin
it calls `await bus.wait_for_input(sid)`, which blocks until the frontend
POSTs to /execute/input/{sid} and the route calls `bus.deliver(sid, value)`.

Single-process design (asyncio.Queue per session). Swap for Redis if we ever
run the API as multiple replicas.
"""
from __future__ import annotations

import asyncio
import secrets
from typing import Protocol


class SessionBus(Protocol):
    def new_session(self) -> str: ...
    async def wait_for_input(self, sid: str, timeout: float = 60.0) -> str: ...
    def deliver(self, sid: str, value: str) -> bool: ...
    def end(self, sid: str) -> None: ...


class InMemorySessionBus:
    def __init__(self) -> None:
        self._queues: dict[str, asyncio.Queue[str]] = {}

    def new_session(self) -> str:
        sid = secrets.token_urlsafe(12)
        self._queues[sid] = asyncio.Queue(maxsize=1)
        return sid

    async def wait_for_input(self, sid: str, timeout: float = 60.0) -> str:
        queue = self._queues.get(sid)
        if queue is None:
            raise KeyError(f"Unknown session {sid}")
        return await asyncio.wait_for(queue.get(), timeout=timeout)

    def deliver(self, sid: str, value: str) -> bool:
        queue = self._queues.get(sid)
        if queue is None:
            return False
        try:
            queue.put_nowait(value)
            return True
        except asyncio.QueueFull:
            return False

    def end(self, sid: str) -> None:
        self._queues.pop(sid, None)


bus: SessionBus = InMemorySessionBus()
