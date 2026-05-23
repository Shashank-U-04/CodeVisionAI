"""Integration tests for the C/C++ and Java tracers.

Each test is gated by a marker that conftest.py drops if the toolchain
isn't on PATH, so the suite stays green on machines that only have
Python (e.g. a CI image that hasn't installed JDK yet).
"""
from __future__ import annotations

import asyncio

import pytest

from app.core.session_bus import bus
from app.tracers.java_tracer import stream_java_execution
from app.tracers.native_tracer import stream_native_execution


C_HELLO = """\
#include <stdio.h>
int main(void) {
    int x = 1 + 2;
    printf("hello %d\\n", x);
    return 0;
}
"""

CPP_IOSTREAM = """\
#include <iostream>
int main() {
    int a, b;
    std::cin >> a >> b;
    std::cout << "sum=" << (a + b) << std::endl;
    return 0;
}
"""

JAVA_HELLO = """\
public class Main {
    public static void main(String[] args) {
        int x = 1 + 2;
        System.out.println("hello " + x);
    }
}
"""


async def _collect(stream) -> list:
    events = []
    async for ev in stream:
        events.append(ev)
    return events


@pytest.mark.requires_gcc
async def test_c_basic_runs_to_completion():
    events = await _collect(
        stream_native_execution(C_HELLO, language="c", step_budget=50)
    )
    types = [e.type for e in events]
    assert "READY" in types
    assert "DONE" in types
    assert "STEP" in types
    output = "".join(e.value for e in events if e.type == "OUTPUT")
    assert "hello 3" in output


@pytest.mark.requires_gpp
async def test_cpp_iostream_interactive_two_reads():
    sid = bus.new_session()
    try:
        async def feed():
            for val in ("7", "35"):
                while not bus.deliver(sid, val):
                    await asyncio.sleep(0.05)

        feeder = asyncio.create_task(feed())
        try:
            events = await _collect(
                stream_native_execution(
                    CPP_IOSTREAM,
                    language="cpp",
                    step_budget=200,
                    session_id=sid,
                )
            )
        finally:
            feeder.cancel()
            try:
                await feeder
            except (asyncio.CancelledError, Exception):
                pass

        output = "".join(e.value for e in events if e.type == "OUTPUT")
        assert "sum=42" in output
        input_requests = [e for e in events if e.type == "INPUT_REQUEST"]
        assert len(input_requests) >= 2
    finally:
        bus.end(sid)


@pytest.mark.requires_jdk
async def test_java_basic_runs_to_completion():
    events = await _collect(
        stream_java_execution(JAVA_HELLO, step_budget=200)
    )
    types = [e.type for e in events]
    assert "READY" in types
    assert "DONE" in types
    output = "".join(e.value for e in events if e.type == "OUTPUT")
    assert "hello 3" in output
