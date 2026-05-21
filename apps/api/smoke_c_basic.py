"""Regression check: basic C (no stdin) still works after tracer changes."""
from __future__ import annotations
import asyncio
from app.tracers.native_tracer import stream_native_execution

SAMPLE = """\
#include <stdio.h>
int main(void) {
    int sum = 0;
    for (int i = 1; i <= 5; i++) {
        sum += i;
    }
    printf("%d\\n", sum);
    return 0;
}
"""

async def _run() -> int:
    steps = 0
    out = []
    done = False
    async for ev in stream_native_execution(SAMPLE, language="c", step_budget=80):
        if ev.type == "STEP":
            steps += 1
        elif ev.type == "OUTPUT":
            out.append(ev.value)
        elif ev.type == "ERROR":
            print(f"ERR: {ev.message}")
            return 1
        elif ev.type == "DONE":
            done = True
    output = "".join(out).strip()
    print(f"steps={steps} done={done} stdout={output!r}")
    return 0 if (done and "15" in output) else 1

if __name__ == "__main__":
    raise SystemExit(asyncio.run(_run()))
