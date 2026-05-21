"""
Smoke-test the Java tracer in isolation (no FastAPI, no HTTP).

Drives `stream_java_execution` against a tiny Java program and prints the
NDJSON event stream that would otherwise flow out over SSE. Useful for
validating the JDI <-> Pydantic event mapping end-to-end without paying
the cost of spinning up the API server.

Run from `apps/api/`:

    python smoke_java.py
"""
from __future__ import annotations

import asyncio
import sys
from collections import Counter

from app.tracers.java_tracer import stream_java_execution

SAMPLE = """\
public class Main {
    public static void main(String[] args) {
        int sum = 0;
        for (int i = 1; i <= 5; i++) {
            sum += i;
        }
        int[] arr = {sum, sum * 2, sum * 3};
        System.out.println("sum = " + sum);
        System.out.println("len = " + arr.length);
    }
}
"""


async def _run() -> int:
    counts: Counter[str] = Counter()
    saw_done = False
    step_lines: list[int] = []
    error_messages: list[str] = []

    async for event in stream_java_execution(SAMPLE, step_budget=200):
        counts[event.type] += 1
        if event.type == "STEP":
            step_lines.append(event.state.line)
        elif event.type == "OUTPUT":
            sys.stdout.write(f"[OUTPUT] {event.value}")
        elif event.type == "ERROR":
            error_messages.append(event.message)
            print(f"[ERROR] {event.message}")
        elif event.type == "DONE":
            saw_done = True

    print("\n=== summary ===")
    for kind, n in counts.most_common():
        print(f"  {kind}: {n}")
    if step_lines:
        print(f"  step line range: {min(step_lines)}..{max(step_lines)}")
    if not saw_done:
        print("  WARNING: stream ended without DONE")
        return 1
    if not step_lines:
        print("  WARNING: no STEP events received")
        return 1
    if error_messages:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_run()))
