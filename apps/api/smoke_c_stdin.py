"""Smoke-test C stdin pre-supply via freopen prologue."""
from __future__ import annotations

import asyncio

from app.tracers.native_tracer import stream_native_execution

SAMPLE = """\
#include <stdio.h>
int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) {
        printf("scanf failed\\n");
        return 1;
    }
    printf("%d\\n", a + b);
    return 0;
}
"""


async def _run() -> int:
    saw_done = False
    out_buf: list[str] = []
    async for event in stream_native_execution(SAMPLE, language="c", step_budget=50, stdin="7 35\n"):
        if event.type == "OUTPUT":
            out_buf.append(event.value)
        elif event.type == "ERROR":
            print(f"[ERROR] {event.message}")
            return 1
        elif event.type == "DONE":
            saw_done = True

    output = "".join(out_buf).strip()
    print(f"stdout: {output!r}")
    if not saw_done:
        print("MISSING DONE")
        return 1
    if "42" not in output:
        print("expected 42")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_run()))
