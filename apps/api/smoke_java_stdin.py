"""Smoke-test Java stdin pre-supply.

Drives a program that reads two ints via Scanner and prints their sum.
Confirms stdin file is delivered to the JVM before execution.
"""
from __future__ import annotations

import asyncio

from app.tracers.java_tracer import stream_java_execution

SAMPLE = """\
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
    }
}
"""


async def _run() -> int:
    output_buf: list[str] = []
    saw_done = False
    async for event in stream_java_execution(SAMPLE, step_budget=100, stdin="7 35\n"):
        if event.type == "OUTPUT":
            output_buf.append(event.value)
        elif event.type == "ERROR":
            print(f"[ERROR] {event.message}")
            return 1
        elif event.type == "DONE":
            saw_done = True

    output = "".join(output_buf).strip()
    print(f"stdout: {output!r}")
    if not saw_done:
        print("MISSING DONE")
        return 1
    if "42" not in output:
        print("expected 42 in output")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_run()))
