"""
Java tracer driver.

Lazily compiles `apps/api/app/tracers/java/*.java` into a cached `.build/`
directory, then for each request:

  1. Compiles the user-supplied source as `Main.java` in a tmp workdir.
  2. Spawns `java -cp <tracer-build> com.codevisionai.tracer.JdiTracer
     Main <workdir> <step-budget>` — the tracer in turn uses JDI's
     LaunchingConnector to launch a child JVM via MainLauncher (which
     installs CvaiInputStream as System.in) that actually runs the user
     code.
  3. Reads NDJSON EngineEvent lines from the tracer's stdout and re-emits
     them as Pydantic events, exactly matching the wire format the C/C++
     tracer and the in-browser Pyodide engine produce.
  4. Pre-supplied stdin is written immediately to the JdiTracer pipe and
     relayed to the target JVM. When the target asks for more input,
     CvaiInputStream prints a sentinel to stderr; JdiTracer turns that
     into an INPUT_REQUEST event, which this driver re-emits with the
     real session_id and blocks on `bus.wait_for_input` until the
     frontend POSTs to /execute/input/{sid}.
"""
from __future__ import annotations

import asyncio
import json
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import AsyncIterator

from pydantic import ValidationError

from ..core.session_bus import bus
from ..schemas.execution import (
    EngineEvent,
    EventDone,
    EventError,
    EventInputRequest,
    EventOutput,
    EventReady,
    EventStep,
)

DEFAULT_STEP_BUDGET = 2000
DEFAULT_TIMEOUT_S = 120.0
COMPILE_TIMEOUT_S = 20.0
SHUTDOWN_GRACE_S = 3.0

_THIS_DIR = Path(__file__).resolve().parent
_TRACER_DIR = _THIS_DIR / "java"
_TRACER_SRC = _TRACER_DIR / "JdiTracer.java"
_TRACER_BUILD = _TRACER_DIR / ".build"
_TRACER_PKG = "com.codevisionai.tracer"
_TRACER_CLASS = f"{_TRACER_PKG}.JdiTracer"
_TRACER_CLASS_FILE = _TRACER_BUILD / "com" / "codevisionai" / "tracer" / "JdiTracer.class"

# Limit how much stderr we surface from a misbehaving tracer so a runaway
# stack trace can't blow past the SSE payload cap downstream.
_STDERR_TAIL_CHARS = 500


def _is_tracer_stale() -> bool:
    if not _TRACER_CLASS_FILE.exists():
        return True
    newest_src = max((p.stat().st_mtime for p in _TRACER_DIR.glob("*.java")), default=0)
    return _TRACER_CLASS_FILE.stat().st_mtime < newest_src


def _compile_tracer() -> str | None:
    _TRACER_BUILD.mkdir(parents=True, exist_ok=True)
    sources = sorted(str(p) for p in _TRACER_DIR.glob("*.java"))
    cmd = ["javac", "-d", str(_TRACER_BUILD), *sources]
    cc = subprocess.run(cmd, capture_output=True, text=True, timeout=COMPILE_TIMEOUT_S)
    if cc.returncode != 0:
        return (cc.stderr or cc.stdout).strip() or "Tracer compilation failed"
    return None


def _compile_user(workdir: Path, code: str) -> str | None:
    src = workdir / "Main.java"
    src.write_text(code, encoding="utf-8")
    cmd = ["javac", "-g", "-d", str(workdir), str(src)]
    cc = subprocess.run(cmd, capture_output=True, text=True, timeout=COMPILE_TIMEOUT_S)
    if cc.returncode != 0:
        return (cc.stderr or cc.stdout).strip() or "Compilation failed"
    return None


def _parse_ndjson_event(line: str) -> EngineEvent | None:
    line = line.strip()
    if not line:
        return None
    try:
        obj = json.loads(line)
    except json.JSONDecodeError:
        return None
    if not isinstance(obj, dict):
        return None
    kind = obj.get("type")
    try:
        if kind == "READY":
            return EventReady()
        if kind == "DONE":
            return EventDone()
        if kind == "OUTPUT":
            return EventOutput(value=obj.get("value", ""))
        if kind == "ERROR":
            return EventError(message=obj.get("message", "unknown"), line=obj.get("line"))
        if kind == "STEP":
            return EventStep.model_validate(obj)
        if kind == "INPUT_REQUEST":
            # session_id is patched in by the Python driver before re-emit.
            return EventInputRequest(prompt=obj.get("prompt", ""), sessionId=obj.get("sessionId", ""))
    except ValidationError:
        return None
    return None


async def _terminate_proc(proc: asyncio.subprocess.Process) -> None:
    if proc.returncode is not None:
        return
    try:
        proc.terminate()
    except ProcessLookupError:
        return
    try:
        await asyncio.wait_for(proc.wait(), timeout=SHUTDOWN_GRACE_S)
    except asyncio.TimeoutError:
        try:
            proc.kill()
        except ProcessLookupError:
            pass


async def stream_java_execution(
    code: str,
    *,
    step_budget: int = DEFAULT_STEP_BUDGET,
    stdin: str = "",
    session_id: str = "",
) -> AsyncIterator[EngineEvent]:
    workdir = Path(tempfile.mkdtemp(prefix="cvai_java_"))
    started_at = time.monotonic()
    proc: asyncio.subprocess.Process | None = None

    try:
        if _is_tracer_stale():
            build_err = await asyncio.to_thread(_compile_tracer)
            if build_err:
                yield EventError(message=f"Internal tracer build failed: {build_err}")
                yield EventDone()
                return

        compile_err = await asyncio.to_thread(_compile_user, workdir, code)
        if compile_err:
            yield EventError(message=compile_err)
            yield EventDone()
            return

        cmd = [
            "java",
            "-cp",
            str(_TRACER_BUILD),
            _TRACER_CLASS,
            "Main",
            str(workdir),
            str(step_budget),
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        assert proc.stdout is not None
        assert proc.stdin is not None

        # Pre-supplied stdin is written immediately; CvaiInputStream serves
        # from this buffer first and only fires INPUT_REQUEST once it's
        # drained.
        if stdin:
            proc.stdin.write(stdin.encode("utf-8"))
            try:
                await proc.stdin.drain()
            except (BrokenPipeError, ConnectionResetError):
                pass

        saw_done = False
        while True:
            if time.monotonic() - started_at > DEFAULT_TIMEOUT_S:
                yield EventError(message="Execution time limit exceeded")
                break

            line = await proc.stdout.readline()
            if not line:
                break

            event = _parse_ndjson_event(line.decode("utf-8", errors="replace"))
            if event is None:
                continue

            if isinstance(event, EventInputRequest):
                yield EventInputRequest(prompt=event.prompt, sessionId=session_id)
                try:
                    value = await bus.wait_for_input(session_id, timeout=60.0)
                except (asyncio.TimeoutError, KeyError):
                    yield EventError(message="Input request timed out")
                    break
                if not value.endswith("\n"):
                    value += "\n"
                try:
                    proc.stdin.write(value.encode("utf-8"))
                    await proc.stdin.drain()
                except (BrokenPipeError, ConnectionResetError):
                    yield EventError(message="Target JVM closed stdin before input arrived")
                    break
                continue

            yield event
            if isinstance(event, EventDone):
                saw_done = True
                break

        if not saw_done:
            stderr_bytes = await proc.stderr.read() if proc.stderr is not None else b""
            stderr = stderr_bytes.decode("utf-8", errors="replace").strip()
            tail = stderr[-_STDERR_TAIL_CHARS:] if stderr else "no output"
            yield EventError(message=f"Tracer exited unexpectedly: {tail}")
            yield EventDone()

    except subprocess.TimeoutExpired:
        yield EventError(message="Compiler timed out")
        yield EventDone()
    except Exception as exc:  # pylint: disable=broad-except
        yield EventError(message=f"Internal tracer error: {exc!r}")
        yield EventDone()
    finally:
        if proc is not None:
            # Closing stdin lets the JdiTracer relay thread exit and the
            # target JVM see EOF on its System.in if it was still reading.
            if proc.stdin is not None and not proc.stdin.is_closing():
                try:
                    proc.stdin.close()
                except (BrokenPipeError, ConnectionResetError, RuntimeError):
                    pass
            await _terminate_proc(proc)
        shutil.rmtree(workdir, ignore_errors=True)
