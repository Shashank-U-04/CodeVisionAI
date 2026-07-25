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


C_RECURSION = """\
#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main(void) {
    int a = 10;
    int f = factorial(4);
    printf("a=%d f=%d\\n", a, f);
    return 0;
}
"""

CPP_CALLS = """\
#include <iostream>

int square(int n) {
    int r = n * n;
    return r;
}

int main() {
    int total = 0;
    total += square(3);
    std::cout << "total=" << total << std::endl;
    return 0;
}
"""

JAVA_RECURSION = """\
public class Main {
    static int factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        int f = factorial(4);
        System.out.println("f=" + f);
    }
}
"""


async def _collect(stream) -> list:
    events = []
    async for ev in stream:
        events.append(ev)
    return events


def _steps(events: list) -> list:
    return [e for e in events if e.type == "STEP"]


def _max_depth(events: list) -> int:
    return max((len(e.state.frames) for e in _steps(events)), default=0)


def _frame_names(events: list) -> set[str]:
    names: set[str] = set()
    for ev in _steps(events):
        for fr in ev.state.frames:
            names.add(fr.name)
    return names


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


# ─── call-stack depth ─────────────────────────────────────────────────────
#
# The visualizer's entire premise is watching the stack grow, and for a long
# time C/C++ stepped *over* calls so every frame list was one deep while the
# rest of the suite stayed green. These assert on depth specifically.


@pytest.mark.requires_gcc
async def test_c_recursion_grows_the_call_stack():
    events = await _collect(
        stream_native_execution(C_RECURSION, language="c", step_budget=400)
    )
    assert "factorial" in _frame_names(events), "never stepped into the callee"
    # factorial(4) recurses to n == 1, so main + four factorial frames.
    assert _max_depth(events) >= 4, f"stack never nested (max {_max_depth(events)})"
    output = "".join(e.value for e in events if e.type == "OUTPUT")
    assert "f=24" in output


@pytest.mark.requires_gcc
async def test_c_hides_locals_before_their_declaration_runs():
    events = await _collect(
        stream_native_execution(C_RECURSION, language="c", step_budget=400)
    )
    first = _steps(events)[0]
    innermost = first.state.frames[-1]
    # Stopped on `int a = 10;` — nothing in main has been assigned, so
    # reporting `f` here would surface indeterminate stack garbage.
    assert "f" not in innermost.locals
    # ...and it must appear once execution has moved past its initializer.
    later = [
        s for s in _steps(events)
        if s.state.frames and s.state.frames[0].name == "main"
        and "f" in s.state.frames[0].locals
    ]
    assert later, "`f` never became visible"


@pytest.mark.requires_gcc
async def test_c_arrays_and_structs_become_heap_objects():
    src = """\
#include <stdio.h>

struct Point { int x; int y; };

int main(void) {
    int arr[3];
    struct Point p;
    arr[0] = 5;
    arr[1] = 6;
    arr[2] = 7;
    p.x = 1;
    p.y = 2;
    printf("%d %d\\n", arr[0], p.y);
    return 0;
}
"""
    events = await _collect(
        stream_native_execution(src, language="c", step_budget=300)
    )
    final = _steps(events)[-1].state
    kinds = {obj.type for obj in final.heap.values()}
    assert "list" in kinds, "array never became a heap object"
    assert "instance" in kinds, "struct never became a heap object"

    lists = [o for o in final.heap.values() if o.type == "list"]
    assert [e.value for e in lists[0].elements] == [5, 6, 7]

    inst = [o for o in final.heap.values() if o.type == "instance"][0]
    assert inst.className == "Point"
    assert inst.attrs["x"].value == 1
    assert inst.attrs["y"].value == 2

    # Every ref a frame holds must resolve to a real heap entry, or the UI
    # draws an arrow into nothing.
    for frame in final.frames:
        for val in frame.locals.values():
            if val.kind == "ref":
                assert val.id in final.heap


@pytest.mark.requires_gpp
async def test_cpp_steps_into_user_function():
    events = await _collect(
        stream_native_execution(CPP_CALLS, language="cpp", step_budget=400)
    )
    assert "square" in _frame_names(events)
    assert _max_depth(events) >= 2
    output = "".join(e.value for e in events if e.type == "OUTPUT")
    assert "total=9" in output


@pytest.mark.requires_jdk
async def test_java_reports_only_user_frames():
    events = await _collect(
        stream_java_execution(JAVA_RECURSION, step_budget=400)
    )
    steps = _steps(events)
    assert steps

    names = _frame_names(events)
    # The JDI launcher chain used to be reported as real frames, making every
    # stack five deeper than the program the learner wrote.
    assert not {n for n in names if "Launcher" in n or "invoke" in n.lower()}
    assert names <= {"main", "factorial"}, f"unexpected frames: {names}"

    # main alone is depth 1, and the outermost frame is flagged as global.
    main_only = [s for s in steps if len(s.state.frames) == 1]
    assert main_only, "no snapshot with just main"
    assert main_only[0].state.frames[0].name == "main"
    assert main_only[0].state.frames[0].isGlobal

    assert _max_depth(events) >= 4, f"recursion not nested (max {_max_depth(events)})"
    output = "".join(e.value for e in events if e.type == "OUTPUT")
    assert "f=24" in output
