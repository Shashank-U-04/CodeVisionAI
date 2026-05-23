"""Interactive INPUT_REQUEST smoke test for the C/C++ native tracer.

Runs a tiny C program that reads two ints with `scanf` (no pre-supplied
stdin), serves the inputs via the session bus the way the SSE route does,
and asserts the program prints their sum.
"""
from __future__ import annotations

import asyncio
import sys
from typing import Iterable

from app.core.session_bus import bus
from app.tracers.native_tracer import stream_native_execution

C_SAMPLE = """\
#include <stdio.h>
int main(void) {
    int a, b;
    if (scanf("%d", &a) != 1) { printf("read1 failed\\n"); return 1; }
    if (scanf("%d", &b) != 1) { printf("read2 failed\\n"); return 2; }
    printf("sum=%d\\n", a + b);
    return 0;
}
"""

CPP_SAMPLE = """\
#include <iostream>
int main() {
    int a, b;
    std::cin >> a;
    std::cin >> b;
    std::cout << "sum=" << (a + b) << std::endl;
    return 0;
}
"""


async def _run(language: str, code: str, inputs: Iterable[str]) -> int:
    sid = bus.new_session()
    out_buf: list[str] = []
    saw_done = False
    input_requests = 0

    async def _serve_inputs() -> None:
        nonlocal input_requests
        for value in inputs:
            # Wait briefly for the tracer to fire INPUT_REQUEST, then deliver.
            while not bus.deliver(sid, value):
                await asyncio.sleep(0.05)
            input_requests += 1

    server_task = asyncio.create_task(_serve_inputs())

    try:
        async for ev in stream_native_execution(
            code,
            language=language,  # type: ignore[arg-type]
            step_budget=400,
            stdin="",
            session_id=sid,
        ):
            if ev.type == "OUTPUT":
                out_buf.append(ev.value)
            elif ev.type == "INPUT_REQUEST":
                print(f"[{language} INPUT_REQUEST sid={ev.sessionId}]")
            elif ev.type == "ERROR":
                print(f"[{language} ERROR] {ev.message}")
                return 1
            elif ev.type == "DONE":
                saw_done = True
    finally:
        server_task.cancel()
        try:
            await server_task
        except (asyncio.CancelledError, Exception):
            pass
        bus.end(sid)

    output = "".join(out_buf)
    print(f"[{language}] output={output!r} input_requests={input_requests} done={saw_done}")
    if not saw_done:
        print(f"[{language}] MISSING DONE")
        return 1
    if "sum=42" not in output:
        print(f"[{language}] expected sum=42")
        return 1
    print(f"[{language}] OK")
    return 0


async def _main() -> int:
    rc = 0
    rc |= await _run("c", C_SAMPLE, ["7", "35"])
    rc |= await _run("cpp", CPP_SAMPLE, ["7", "35"])
    return rc


if __name__ == "__main__":
    sys.exit(asyncio.run(_main()))
