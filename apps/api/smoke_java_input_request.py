"""Interactive INPUT_REQUEST smoke test for the Java tracer.

Runs a Java program that reads two ints via Scanner without any pre-supplied
stdin. The tracer should emit INPUT_REQUEST events; this script answers them
via the in-memory session bus, simulating what the SSE route does.
"""
from __future__ import annotations

import asyncio

from app.core.session_bus import bus
from app.tracers.java_tracer import stream_java_execution

SAMPLE = """\
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.println("first?");
        int a = sc.nextInt();
        System.out.println("second?");
        int b = sc.nextInt();
        System.out.println("sum=" + (a + b));
    }
}
"""

INPUTS = iter(["7", "35"])


async def _consumer(session_id: str) -> None:
    """Run the tracer, react to INPUT_REQUEST events from inside the same loop."""
    out_buf: list[str] = []
    saw_done = False
    input_requests = 0

    async def _serve_inputs() -> None:
        # Drain the iterator one value at a time as requests arrive.
        nonlocal input_requests
        for value in INPUTS:
            # Wait briefly for the tracer to fire INPUT_REQUEST, then deliver.
            await asyncio.sleep(0.05)
            while not bus.deliver(session_id, value):
                await asyncio.sleep(0.05)
            input_requests += 1

    server_task = asyncio.create_task(_serve_inputs())

    async for ev in stream_java_execution(
        SAMPLE, step_budget=200, stdin="", session_id=session_id
    ):
        if ev.type == "OUTPUT":
            out_buf.append(ev.value)
        elif ev.type == "INPUT_REQUEST":
            print(f"[INPUT_REQUEST sid={ev.sessionId}]")
        elif ev.type == "ERROR":
            print(f"[ERROR] {ev.message}")
            return
        elif ev.type == "DONE":
            saw_done = True

    await server_task
    output = "".join(out_buf)
    print(f"output:\n{output}")
    print(f"saw_done={saw_done} input_requests_delivered={input_requests}")
    assert saw_done, "missing DONE"
    assert "sum=42" in output, f"expected sum=42 in output, got: {output!r}"
    print("OK")


async def _main() -> int:
    sid = bus.new_session()
    try:
        await _consumer(sid)
    finally:
        bus.end(sid)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_main()))
