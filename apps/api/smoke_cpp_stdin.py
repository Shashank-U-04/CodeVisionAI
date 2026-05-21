"""Smoke-test C++ stdin pre-supply via the same freopen prologue used for C."""
from __future__ import annotations

import asyncio

from app.tracers.native_tracer import stream_native_execution

SAMPLE = """\
#include <iostream>
#include <cstdio>
int main() {
    int a, b;
    std::cin >> a >> b;
    std::printf("%d\\n", a + b);
    return 0;
}
"""


async def _run() -> int:
    saw_done = False
    out_buf: list[str] = []
    step_count = 0
    async for event in stream_native_execution(SAMPLE, language="cpp", step_budget=50, stdin="7 35\n"):
        if event.type == "OUTPUT":
            out_buf.append(event.value)
        elif event.type == "STEP":
            step_count += 1
            if step_count <= 3:
                print(f"STEP line={event.state.line} frame={event.state.frames[-1].name if event.state.frames else '?'}")
        elif event.type == "ERROR":
            print(f"[ERROR] {event.message}")
            return 1
        elif event.type == "DONE":
            saw_done = True
    print(f"steps={step_count} done={saw_done}")

    output = "".join(out_buf).strip()
    print(f"stdout: {output!r}")
    if "42" not in output or not saw_done:
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_run()))
