"""
Native-code tracer using GCC/G++ + GDB MI.

Single implementation that handles both C and C++ by way of a `LangSpec`
config — compiler binary, file extension, language standard, virtual
source name reported in #line directives, etc. Behaviour is otherwise
identical: compile with debug info, drive gdb via pygdbmi, step line
by line, yield `EngineEvent`s on the same wire format Pyodide emits.

Stdin is fed through a `StdinChannel` (Windows named pipe / POSIX FIFO)
that the prologue dup2s onto fd 0. That lets `scanf`/`cin >> x` *block*
on read when there is no data — the driver treats a missing `*stopped`
event after `-exec-next` as "blocked on stdin" and emits INPUT_REQUEST,
waits on the session bus for the frontend's reply, and writes the bytes
back into the channel.
"""
from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
import tempfile
import time
from dataclasses import dataclass
from typing import AsyncIterator, Literal

from pygdbmi.gdbcontroller import GdbController

from ..core.session_bus import bus
from ..schemas.execution import (
    EngineEvent,
    EventDone,
    EventError,
    EventInputRequest,
    EventOutput,
    EventReady,
    EventStep,
    ExecutionState,
    StackFrame,
)
from .stdin_channel import StdinChannel, stdin_path_as_c_literal
from .value_parse import parse_value

DEFAULT_STEP_BUDGET = 2000
DEFAULT_TIMEOUT_S = 120.0
GDB_CMD_TIMEOUT_S = 5.0
COMPILE_TIMEOUT_S = 15.0
# How long we wait for a *stopped event after -exec-next before deciding
# the inferior is blocked on stdin. Educational programs step in
# microseconds, so 400ms is generous for "should have finished by now".
STOP_POLL_INTERVAL_S = 0.05
STOP_POLL_BLOCKED_S = 0.4
# Once we've sent input, give the inferior longer to consume + complete
# the step before we conclude it's still blocked and need to prompt again.
STOP_POLL_POST_INPUT_S = 1.5
INPUT_WAIT_TIMEOUT_S = 60.0

_EXIT_REASONS = {"exited", "exited-normally", "exited-signalled"}

NativeLanguage = Literal["c", "cpp"]


@dataclass(frozen=True)
class LangSpec:
    name: NativeLanguage
    compiler: str           # "gcc" or "g++"
    file_ext: str           # "c" or "cpp"
    std: str                # e.g. "c11", "c++17"
    virtual_source: str     # name used in `#line` directive (recognised when filtering frames)
    tmpdir_prefix: str


C_SPEC = LangSpec(
    name="c",
    compiler="gcc",
    file_ext="c",
    std="c11",
    virtual_source="user.c",
    tmpdir_prefix="cvai_c_",
)

CPP_SPEC = LangSpec(
    name="cpp",
    compiler="g++",
    file_ext="cpp",
    std="c++17",
    virtual_source="user.cpp",
    tmpdir_prefix="cvai_cpp_",
)

_SPECS: dict[NativeLanguage, LangSpec] = {"c": C_SPEC, "cpp": CPP_SPEC}


# Prologue injected before user code:
#   - freopen stdout/stderr to a file the Python side tails for OUTPUT events
#   - dup2 fd 0 from a pipe path so scanf and std::cin block on read when the
#     write side has no data queued. The Python driver writes pre-supplied
#     bytes immediately and pumps interactive bytes through INPUT_REQUEST.
#   - `#line 1 "<virtual>"` so GDB reports user lines starting at 1
_PROLOGUE_TEMPLATE = """\
#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>
#ifdef _WIN32
#include <io.h>
#include <stdint.h>
#include <windows.h>
#else
#include <unistd.h>
#endif
__attribute__((constructor(101))) static void __cvai_redirect(void) {{
    freopen("{out_file}", "w", stdout);
    freopen("{out_file}", "a", stderr);
    setvbuf(stdout, NULL, _IONBF, 0);
    setvbuf(stderr, NULL, _IONBF, 0);
#ifdef _WIN32
    /* Use CreateFile directly so we can open named-pipe paths like
       \\\\.\\pipe\\cvai_stdin_xxx — msvcrt's _open does not route the
       \\\\.\\ namespace through CreateFile properly. _open_osfhandle
       takes ownership of the HANDLE and lets us dup2 it onto fd 0. */
    HANDLE __cvai_h = CreateFileA("{in_path}", GENERIC_READ, 0, NULL,
                                  OPEN_EXISTING, 0, NULL);
    if (__cvai_h != INVALID_HANDLE_VALUE) {{
        int __cvai_in_fd = _open_osfhandle((intptr_t)__cvai_h, _O_RDONLY);
        if (__cvai_in_fd >= 0) {{
            _dup2(__cvai_in_fd, 0);
            _close(__cvai_in_fd);
        }} else {{
            CloseHandle(__cvai_h);
        }}
    }}
#else
    int __cvai_in_fd = open("{in_path}", O_RDONLY);
    if (__cvai_in_fd >= 0) {{
        dup2(__cvai_in_fd, 0);
        close(__cvai_in_fd);
    }}
#endif
}}
#line 1 "{virtual}"
"""


# ─── helpers ──────────────────────────────────────────────────────────────


def _to_gdb_path(path: str) -> str:
    return path.replace("\\", "/")


def _result_payload(records: list[dict], message: str | None = None) -> dict | None:
    for rec in records:
        if rec.get("type") == "result" and (message is None or rec.get("message") == message):
            payload = rec.get("payload")
            if isinstance(payload, dict):
                return payload
    return None


def _last_stop_reason(records: list[dict]) -> str | None:
    for rec in reversed(records):
        if rec.get("type") == "notify" and rec.get("message") == "stopped":
            payload = rec.get("payload") or {}
            return payload.get("reason")
    return None


def _program_exited(records: list[dict]) -> bool:
    for rec in records:
        msg = rec.get("message")
        if msg in {"thread-group-exited", "thread-exited"}:
            return True
        if msg == "stopped":
            payload = rec.get("payload") or {}
            if payload.get("reason") in _EXIT_REASONS:
                return True
    return False


def _last_stopped_frame(records: list[dict]) -> dict | None:
    for rec in reversed(records):
        if rec.get("type") == "notify" and rec.get("message") == "stopped":
            payload = rec.get("payload") or {}
            frame = payload.get("frame")
            if isinstance(frame, dict):
                return frame
    return None


def _is_user_file(filename: str, spec: LangSpec) -> bool:
    if not filename:
        return False
    base = filename.replace("\\", "/").rsplit("/", 1)[-1]
    # The virtual source from #line, plus the real on-disk filename.
    return base == spec.virtual_source or base == f"main.{spec.file_ext}"


# Frame functions GCC synthesises for static-init / global-dtor handling.
# These show up after main() returns in C++ programs that use iostreams and
# should be treated as "outside user code" so we stop stepping cleanly.
_SYNTHETIC_FUNC_PREFIXES = ("_fu0_", "_GLOBAL__", "__static_initialization", "__do_global", "_dl_")


def _is_user_func(func: str | None) -> bool:
    if not func:
        return False
    return not any(func.startswith(p) for p in _SYNTHETIC_FUNC_PREFIXES)


# ─── compile ──────────────────────────────────────────────────────────────


def _compile(
    workdir: str,
    code: str,
    spec: LangSpec,
    in_path_c_literal: str,
) -> tuple[str, str | None]:
    out_file = os.path.join(workdir, "stdout.txt")
    src_path = os.path.join(workdir, f"main.{spec.file_ext}")
    exe_path = os.path.join(workdir, "main.exe")

    with open(src_path, "w", encoding="utf-8") as f:
        f.write(_PROLOGUE_TEMPLATE.format(
            out_file=_to_gdb_path(out_file),
            in_path=in_path_c_literal,
            virtual=spec.virtual_source,
        ))
        f.write(code)
    open(out_file, "w").close()

    cmd = [
        spec.compiler,
        "-g3",
        "-O0",
        f"-std={spec.std}",
        "-fno-omit-frame-pointer",
        src_path,
        "-o",
        exe_path,
    ]
    cc = subprocess.run(cmd, capture_output=True, text=True, timeout=COMPILE_TIMEOUT_S)
    if cc.returncode != 0:
        return exe_path, cc.stderr.strip() or "Compilation failed"
    return exe_path, None


# ─── state extraction ─────────────────────────────────────────────────────


def _frames_from_gdb(gdb: GdbController, spec: LangSpec) -> tuple[list[StackFrame], bool]:
    stack_rec = _result_payload(gdb.write("-stack-list-frames", timeout_sec=GDB_CMD_TIMEOUT_S))
    raw_frames = (stack_rec or {}).get("stack") or []

    # Any frame at a user source file counts as user code, even if its
    # immediate function is a GCC-emitted thunk like `_fu0___ZSt3cin`.
    in_user_code = any(
        _is_user_file((raw.get("frame", raw) if isinstance(raw, dict) else {}).get("file") or "", spec)
        for raw in raw_frames
    )

    frames: list[StackFrame] = []
    for raw in raw_frames:
        frame = raw.get("frame", raw) if isinstance(raw, dict) else {}
        level_raw = frame.get("level")
        try:
            level = int(level_raw) if level_raw is not None else 0
        except ValueError:
            level = 0

        raw_func = frame.get("func") or "??"
        # `_fu0___ZSt3cin` and friends are GCC's one-time-init thunks for
        # global symbol access. They show up in the frame stack with the
        # USER source file/line, so we keep the line but rename the function
        # to something a learner can recognize.
        func = "main" if raw_func.startswith("_fu0_") else raw_func
        line_raw = frame.get("line")
        try:
            line = int(line_raw) if line_raw is not None else 0
        except ValueError:
            line = 0

        gdb.write(f"-stack-select-frame {level}", timeout_sec=GDB_CMD_TIMEOUT_S)
        vars_rec = _result_payload(
            gdb.write("-stack-list-variables --all-values", timeout_sec=GDB_CMD_TIMEOUT_S)
        ) or {}

        local_dict: dict = {}
        for var in vars_rec.get("variables") or []:
            local_dict[var.get("name", "?")] = parse_value(var.get("value"), var.get("type"))

        frames.append(
            StackFrame(
                name=func,
                line=line,
                locals=local_dict,
                isGlobal=(func == "main" and level == 0 and len(raw_frames) == 1),
            )
        )

    frames.reverse()
    if frames:
        gdb.write("-stack-select-frame 0", timeout_sec=GDB_CMD_TIMEOUT_S)
    return frames, in_user_code


def _build_state(
    step: int,
    line: int,
    frames: list[StackFrame],
    reason: str,
    stdout: str,
    changed: list[str],
) -> ExecutionState:
    event = "return" if reason == "function-finished" else "line"
    return ExecutionState(
        step=step,
        line=line,
        event=event,
        description=f"Line {line} ({frames[-1].name if frames else '?'})" if frames else "",
        frames=frames,
        heap={},
        stdout=stdout,
        changedVars=changed,
    )


class _StdoutTail:
    def __init__(self, path: str) -> None:
        self._path = path
        self._pos = 0

    def read_new(self) -> str:
        try:
            with open(self._path, "rb") as f:
                f.seek(self._pos)
                data = f.read()
                self._pos = f.tell()
            return data.decode("utf-8", errors="replace")
        except FileNotFoundError:
            return ""


def _diff_changed(prev: list[StackFrame] | None, current: list[StackFrame]) -> list[str]:
    if not prev or not current:
        return []
    prev_top = prev[-1].locals
    cur_top = current[-1].locals
    out: list[str] = []
    for name, val in cur_top.items():
        if name not in prev_top or prev_top[name].model_dump() != val.model_dump():
            out.append(name)
    return out


async def _poll_for_stop(
    gdb: GdbController,
    records: list[dict],
    *,
    total_wait_s: float,
    interval_s: float = STOP_POLL_INTERVAL_S,
) -> tuple[str | None, bool]:
    """Drain GDB events until *stopped/exit arrives or `total_wait_s` elapses.

    Returns (stop_reason, exited). Both can be falsy if we time out while the
    inferior is still running (e.g., blocked on stdin).
    """
    reason = _last_stop_reason(records)
    exited = _program_exited(records)
    if reason is not None or exited:
        return reason, exited

    deadline = time.monotonic() + total_wait_s
    while time.monotonic() < deadline:
        more = await asyncio.to_thread(gdb.get_gdb_response, interval_s, False)
        if more:
            records.extend(more)
            reason = _last_stop_reason(records)
            exited = _program_exited(records)
            if reason is not None or exited:
                return reason, exited
    return reason, exited


# ─── main driver ──────────────────────────────────────────────────────────


async def stream_native_execution(
    code: str,
    *,
    language: NativeLanguage,
    step_budget: int = DEFAULT_STEP_BUDGET,
    stdin: str = "",
    session_id: str = "",
    timeout_s: float | None = None,
) -> AsyncIterator[EngineEvent]:
    spec = _SPECS[language]
    workdir = tempfile.mkdtemp(prefix=spec.tmpdir_prefix)
    out_path = os.path.join(workdir, "stdout.txt")
    gdb: GdbController | None = None
    stdin_channel: StdinChannel | None = None
    started_at = time.monotonic()
    interactive = bool(session_id)
    # Caller-supplied budget wins, but never exceeds the global ceiling.
    wall_clock_s = min(timeout_s or DEFAULT_TIMEOUT_S, DEFAULT_TIMEOUT_S)

    def _bail(message: str) -> EngineEvent:
        return EventError(message=message)

    try:
        stdin_channel = StdinChannel(workdir)
        stdin_channel.start()

        in_path_literal = stdin_path_as_c_literal(stdin_channel)
        exe_path, compile_err = await asyncio.to_thread(
            _compile, workdir, code, spec, in_path_literal
        )
        if compile_err:
            yield _bail(compile_err)
            yield EventDone()
            return

        yield EventReady()

        def _spawn_gdb() -> GdbController:
            return GdbController(command=["gdb", "--interpreter=mi2", "--quiet", "--nx"])

        gdb = await asyncio.to_thread(_spawn_gdb)

        def _w(cmd: str) -> list:
            assert gdb is not None
            return gdb.write(cmd, timeout_sec=GDB_CMD_TIMEOUT_S)

        await asyncio.to_thread(_w, f'-file-exec-and-symbols "{_to_gdb_path(exe_path)}"')
        await asyncio.to_thread(_w, "-break-insert main")
        run_result = await asyncio.to_thread(_w, "-exec-run")

        # Pre-supplied stdin gets pushed into the pipe right after the inferior
        # has had a chance to open it (the prologue runs before main, so by
        # the time -exec-run's *stopped at main arrives the read end exists).
        if stdin:
            try:
                await stdin_channel.write(stdin.encode("utf-8"))
            except (BrokenPipeError, OSError, TimeoutError) as exc:
                yield _bail(f"Failed to deliver pre-supplied stdin: {exc}")
                yield EventDone()
                return

        # `-exec-run` returns `^running` immediately; the breakpoint-hit
        # `*stopped` arrives later (often noticeably later in C++ due to
        # thread init). Drain follow-up events until we see a stop reason
        # or run out of patience.
        if _last_stop_reason(run_result) is None:
            for _ in range(20):
                more = await asyncio.to_thread(gdb.get_gdb_response, 0.5, False)
                if more:
                    run_result.extend(more)
                    if _last_stop_reason(run_result) is not None:
                        break
                    if _program_exited(run_result):
                        break

        if _last_stop_reason(run_result) is None and not _program_exited(run_result):
            yield _bail("Program failed to start under GDB (no breakpoint hit)")
            yield EventDone()
            return

        tail = _StdoutTail(out_path)
        prev_frames: list[StackFrame] | None = None

        for step_idx in range(step_budget):
            if time.monotonic() - started_at > wall_clock_s:
                yield _bail("Execution time limit exceeded")
                break

            frames, in_user_code = await asyncio.to_thread(_frames_from_gdb, gdb, spec)
            if not in_user_code:
                chunk = tail.read_new()
                if chunk:
                    yield EventOutput(value=chunk)
                break
            line = frames[-1].line if frames else 0
            changed = _diff_changed(prev_frames, frames)

            chunk = tail.read_new()
            if chunk:
                yield EventOutput(value=chunk)

            state = _build_state(step_idx, line, frames, "line", chunk, changed)
            yield EventStep(state=state)

            prev_frames = frames

            # -exec-next steps over function calls instead of into them.
            # That gives up stepping into user-defined helpers but is the
            # only reliable way to traverse iostream-heavy C++ on Windows
            # MinGW; -exec-step lands in libstdc++ TUs that have no source
            # information, and -exec-finish from there frequently bounces
            # out past main entirely.
            step_result = await asyncio.to_thread(_w, "-exec-next")
            reason, exited = await _poll_for_stop(
                gdb, step_result, total_wait_s=STOP_POLL_BLOCKED_S
            )

            # No *stopped yet and program still alive → assume blocked on
            # stdin. Emit INPUT_REQUEST, deliver bytes, loop until we see
            # the *stopped or the inferior exits / dies.
            input_loop_guard = 0
            while (
                reason is None
                and not exited
                and interactive
                and input_loop_guard < 32
            ):
                input_loop_guard += 1

                # Flush any output (e.g., a `printf("name? ")` printed right
                # before the read) so the UI shows the prompt.
                chunk = tail.read_new()
                if chunk:
                    yield EventOutput(value=chunk)

                yield EventInputRequest(prompt="", sessionId=session_id)
                try:
                    value = await bus.wait_for_input(
                        session_id, timeout=INPUT_WAIT_TIMEOUT_S
                    )
                except (asyncio.TimeoutError, KeyError):
                    yield _bail("Input request timed out")
                    reason = "timeout"
                    break

                if not value.endswith("\n"):
                    value += "\n"
                try:
                    await stdin_channel.write(value.encode("utf-8"))
                except (BrokenPipeError, OSError, TimeoutError) as exc:
                    yield _bail(f"Failed to deliver input: {exc}")
                    reason = "deliver-failed"
                    break

                reason, exited = await _poll_for_stop(
                    gdb, step_result, total_wait_s=STOP_POLL_POST_INPUT_S
                )

            if reason in {"timeout", "deliver-failed"}:
                break

            for _ in range(12):
                if reason in _EXIT_REASONS or _program_exited(step_result):
                    break
                stopped_frame = _last_stopped_frame(step_result)
                if stopped_frame is None:
                    # No *stopped record at all → program actually exited.
                    reason = "exited"
                    break
                stopped_file = stopped_frame.get("file") or ""
                # The file check is authoritative: if GDB reports a user
                # source file we're at a user source line, even if the
                # immediate function is a compiler-generated thunk such as
                # `_fu0___ZSt3cin` (GCC's one-time-init wrapper for global
                # references like std::cin). Filtering those out with
                # -exec-finish from main is what's bouncing us past return.
                if _is_user_file(stopped_file, spec):
                    break
                # In system / library code (libstdc++, CRT). `file` may be
                # absent entirely when there's no debug info. Step out and
                # try again.
                step_result = await asyncio.to_thread(_w, "-exec-finish")
                reason, exited = await _poll_for_stop(
                    gdb, step_result, total_wait_s=STOP_POLL_BLOCKED_S
                )

            if reason in _EXIT_REASONS or _program_exited(step_result):
                chunk = tail.read_new()
                if chunk:
                    yield EventOutput(value=chunk)
                break
            if reason is None:
                follow_up = await asyncio.to_thread(gdb.get_gdb_response, 1.0, True)
                if _program_exited(follow_up):
                    chunk = tail.read_new()
                    if chunk:
                        yield EventOutput(value=chunk)
                    break
                yield _bail("GDB lost track of program state")
                break
        else:
            yield _bail(f"Step budget of {step_budget} exceeded")

        yield EventDone()

    except subprocess.TimeoutExpired:
        yield _bail("Compiler timed out")
        yield EventDone()
    except Exception as exc:  # pylint: disable=broad-except
        yield _bail(f"Internal tracer error: {exc!r}")
        yield EventDone()
    finally:
        if gdb is not None:
            try:
                await asyncio.to_thread(gdb.exit)
            except Exception:  # pylint: disable=broad-except
                pass
        if stdin_channel is not None:
            stdin_channel.close()
        shutil.rmtree(workdir, ignore_errors=True)


# Backwards-compatible shims so route imports keep working.
async def stream_c_execution(
    code: str,
    *,
    step_budget: int = DEFAULT_STEP_BUDGET,
    stdin: str = "",
    session_id: str = "",
    timeout_s: float | None = None,
) -> AsyncIterator[EngineEvent]:
    async for event in stream_native_execution(
        code,
        language="c",
        step_budget=step_budget,
        stdin=stdin,
        session_id=session_id,
        timeout_s=timeout_s,
    ):
        yield event


async def stream_cpp_execution(
    code: str,
    *,
    step_budget: int = DEFAULT_STEP_BUDGET,
    stdin: str = "",
    session_id: str = "",
    timeout_s: float | None = None,
) -> AsyncIterator[EngineEvent]:
    async for event in stream_native_execution(
        code,
        language="cpp",
        step_budget=step_budget,
        stdin=stdin,
        session_id=session_id,
        timeout_s=timeout_s,
    ):
        yield event
