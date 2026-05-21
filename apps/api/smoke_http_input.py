"""Verify the full SSE INPUT_REQUEST handshake over HTTP.

Hits POST /api/v1/execute/stream, parses the SSE event stream, and when an
INPUT_REQUEST event arrives posts the next value to /execute/input/{sid}.
Mirrors what the browser will do.
"""
from __future__ import annotations

import asyncio
import json
import re

import urllib.request

API = "http://127.0.0.1:8765"

CODE = (
    "import java.util.Scanner;\n"
    "public class Main {\n"
    "    public static void main(String[] a){\n"
    "        Scanner s = new Scanner(System.in);\n"
    "        int x = s.nextInt();\n"
    "        int y = s.nextInt();\n"
    "        System.out.println(x + y);\n"
    "    }\n"
    "}\n"
)

INPUTS = iter(["7", "35"])


def _post_input(sid: str, value: str) -> None:
    body = json.dumps({"value": value}).encode("utf-8")
    req = urllib.request.Request(
        f"{API}/api/v1/execute/input/{sid}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        resp.read()


async def _run() -> int:
    import aiohttp  # local import so module also lints without aiohttp installed
    payload = {
        "language": "java",
        "code": CODE,
        "options": {"step_budget": 100, "timeout_ms": 15000},
    }
    saw_output = []
    saw_done = False
    input_requests = 0
    async with aiohttp.ClientSession() as cs:
        async with cs.post(f"{API}/api/v1/execute/stream", json=payload) as resp:
            assert resp.status == 200, resp.status
            sid = resp.headers.get("X-Session-Id") or ""
            buffer = ""
            async for chunk in resp.content.iter_any():
                buffer += chunk.decode("utf-8", errors="replace")
                while True:
                    m = re.search(r"\r?\n\r?\n", buffer)
                    if not m:
                        break
                    event_block = buffer[: m.start()]
                    buffer = buffer[m.end():]
                    data_lines = [
                        ln[5:].lstrip()
                        for ln in event_block.split("\n")
                        if ln.startswith("data:")
                    ]
                    if not data_lines:
                        continue
                    try:
                        ev = json.loads("\n".join(data_lines))
                    except json.JSONDecodeError:
                        continue
                    if ev.get("type") == "OUTPUT":
                        saw_output.append(ev.get("value", ""))
                    elif ev.get("type") == "INPUT_REQUEST":
                        input_requests += 1
                        value = next(INPUTS)
                        # the POST is sync; do it off the event loop
                        await asyncio.to_thread(_post_input, sid, value)
                    elif ev.get("type") == "DONE":
                        saw_done = True
                if saw_done:
                    break
    out = "".join(saw_output)
    print(f"output={out!r} input_requests={input_requests} done={saw_done}")
    if not saw_done or "42" not in out:
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_run()))
