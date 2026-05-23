"""Route-level integration tests using fastapi.testclient."""
from __future__ import annotations

import json
import re

from fastapi.testclient import TestClient

from app.main import app

# sse-starlette emits \r\n\r\n separators on Windows and \n\n on POSIX.
_SSE_BLOCK_SPLIT = re.compile(r"\r?\n\r?\n")


def _parse_sse(body: str) -> list[dict]:
    events: list[dict] = []
    for block in _SSE_BLOCK_SPLIT.split(body):
        data_lines = [
            ln[5:].lstrip()
            for ln in block.splitlines()
            if ln.startswith("data:")
        ]
        if not data_lines:
            continue
        try:
            events.append(json.loads("\n".join(data_lines)))
        except json.JSONDecodeError:
            continue
    return events


def test_health_ok():
    with TestClient(app) as c:
        r = c.get("/api/v1/health/")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}


def test_mock_stream_emits_ready_steps_done():
    with TestClient(app) as c:
        r = c.post(
            "/api/v1/execute/stream",
            json={"language": "mock", "code": "a\nb\nc"},
        )
        assert r.status_code == 200
        assert r.headers.get("X-Session-Id")
        events = _parse_sse(r.text)
        types = [e.get("type") for e in events]
        assert types[0] == "READY"
        assert types[-1] == "DONE"
        assert "STEP" in types
        assert "OUTPUT" in types


def test_invalid_language_rejected():
    with TestClient(app) as c:
        r = c.post(
            "/api/v1/execute/stream",
            json={"language": "lolcode", "code": "x"},
        )
        assert r.status_code == 422


def test_oversized_code_rejected():
    with TestClient(app) as c:
        r = c.post(
            "/api/v1/execute/stream",
            json={"language": "mock", "code": "x" * 64_001},
        )
        assert r.status_code == 422


def test_input_endpoint_rejects_unknown_session():
    with TestClient(app) as c:
        r = c.post(
            "/api/v1/execute/input/no-such-session",
            json={"value": "hi"},
        )
        assert r.status_code == 404


def test_cancel_endpoint_is_idempotent_for_unknown_session():
    with TestClient(app) as c:
        r = c.post("/api/v1/execute/cancel/whatever")
        assert r.status_code == 200
        assert r.json() == {"status": "cancelled"}


def test_rate_limit_kicks_in_after_burst():
    with TestClient(app) as c:
        statuses = []
        for _ in range(30):
            r = c.post(
                "/api/v1/execute/stream",
                json={"language": "mock", "code": "x"},
            )
            statuses.append(r.status_code)
        assert 429 in statuses, statuses
