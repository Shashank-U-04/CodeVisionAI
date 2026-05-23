"""Cross-platform stdin channel for the native tracer.

The C/C++ tracer's prologue dup2s a pipe path onto fd 0 so that `scanf`,
`cin >> x`, and friends *block* on read when there is no data — that's
the signal the Python driver uses to emit INPUT_REQUEST instead of
returning a premature EOF.

On Windows this is a named pipe (PIPE_ACCESS_OUTBOUND, byte mode) driven
through ctypes. On POSIX it's a FIFO created via `os.mkfifo`. Either
way, `.path` is what the inferior opens read-only, and `.write_blocking`
is how the driver pushes interactive bytes into it.
"""
from __future__ import annotations

import asyncio
import os
import secrets
import sys
import threading
from typing import Optional, Protocol

if sys.platform == "win32":
    import ctypes
    from ctypes import wintypes

    _kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    _kernel32.CreateNamedPipeW.argtypes = [
        wintypes.LPCWSTR,
        wintypes.DWORD,
        wintypes.DWORD,
        wintypes.DWORD,
        wintypes.DWORD,
        wintypes.DWORD,
        wintypes.DWORD,
        ctypes.c_void_p,
    ]
    _kernel32.CreateNamedPipeW.restype = wintypes.HANDLE
    _kernel32.ConnectNamedPipe.argtypes = [wintypes.HANDLE, ctypes.c_void_p]
    _kernel32.ConnectNamedPipe.restype = wintypes.BOOL
    _kernel32.WriteFile.argtypes = [
        wintypes.HANDLE,
        ctypes.c_void_p,
        wintypes.DWORD,
        ctypes.POINTER(wintypes.DWORD),
        ctypes.c_void_p,
    ]
    _kernel32.WriteFile.restype = wintypes.BOOL
    _kernel32.FlushFileBuffers.argtypes = [wintypes.HANDLE]
    _kernel32.FlushFileBuffers.restype = wintypes.BOOL
    _kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    _kernel32.CloseHandle.restype = wintypes.BOOL
    _kernel32.DisconnectNamedPipe.argtypes = [wintypes.HANDLE]
    _kernel32.DisconnectNamedPipe.restype = wintypes.BOOL

    _PIPE_ACCESS_OUTBOUND = 0x00000002
    _PIPE_TYPE_BYTE = 0x00000000
    _PIPE_WAIT = 0x00000000
    _INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value
    _ERROR_PIPE_CONNECTED = 535


class _Impl(Protocol):
    path: str

    def start(self) -> None: ...

    def write_blocking(self, data: bytes, *, connect_timeout: float) -> None: ...

    def close(self) -> None: ...


class StdinChannel:
    """One-direction write channel; the inferior opens `.path` read-only."""

    def __init__(self, workdir: str) -> None:
        if sys.platform == "win32":
            self._impl: _Impl = _WindowsPipe()
        else:
            self._impl = _PosixFifo(workdir)
        self.path: str = self._impl.path

    def start(self) -> None:
        self._impl.start()

    def write_blocking(self, data: bytes, *, connect_timeout: float = 5.0) -> None:
        self._impl.write_blocking(data, connect_timeout=connect_timeout)

    async def write(self, data: bytes, *, connect_timeout: float = 5.0) -> None:
        await asyncio.to_thread(
            self.write_blocking, data, connect_timeout=connect_timeout
        )

    def close(self) -> None:
        try:
            self._impl.close()
        except Exception:  # noqa: BLE001 - best-effort cleanup
            pass


def stdin_path_as_c_literal(channel: StdinChannel) -> str:
    """Escape `channel.path` for embedding inside a C double-quoted string."""
    return channel.path.replace("\\", "\\\\").replace('"', '\\"')


if sys.platform == "win32":

    class _WindowsPipe:
        def __init__(self) -> None:
            self._name: str = rf"\\.\pipe\cvai_stdin_{secrets.token_hex(8)}"
            self.path: str = self._name
            self._handle: Optional[int] = None
            self._connected = threading.Event()
            self._connect_error: Optional[OSError] = None
            self._connect_thread: Optional[threading.Thread] = None
            self._closed = False
            self._lock = threading.Lock()

        def start(self) -> None:
            handle = _kernel32.CreateNamedPipeW(
                self._name,
                _PIPE_ACCESS_OUTBOUND,
                _PIPE_TYPE_BYTE | _PIPE_WAIT,
                1,
                65536,
                65536,
                0,
                None,
            )
            if handle in (0, _INVALID_HANDLE_VALUE, None):
                err = ctypes.get_last_error()
                raise OSError(err, f"CreateNamedPipeW failed for {self._name}")
            self._handle = handle

            def _connect() -> None:
                # ConnectNamedPipe blocks until the inferior opens the pipe.
                # When the client opens first (race we sometimes win), the call
                # returns FALSE with ERROR_PIPE_CONNECTED which is success.
                ok = _kernel32.ConnectNamedPipe(self._handle, None)
                if not ok:
                    err = ctypes.get_last_error()
                    if err != _ERROR_PIPE_CONNECTED:
                        self._connect_error = OSError(
                            err, "ConnectNamedPipe failed"
                        )
                self._connected.set()

            self._connect_thread = threading.Thread(target=_connect, daemon=True)
            self._connect_thread.start()

        def write_blocking(self, data: bytes, *, connect_timeout: float) -> None:
            if not data:
                return
            if not self._connected.wait(timeout=connect_timeout):
                raise TimeoutError(
                    "Stdin pipe never opened by inferior process"
                )
            if self._connect_error is not None:
                raise self._connect_error
            with self._lock:
                if self._handle is None or self._closed:
                    raise BrokenPipeError("Stdin pipe closed")
                written = wintypes.DWORD(0)
                buf = ctypes.create_string_buffer(data, len(data))
                # NOTE: do NOT call FlushFileBuffers — on the server end of a
                # named pipe it blocks until the client has *consumed* all
                # queued bytes, which deadlocks pre-supplied stdin (the
                # inferior hasn't reached its scanf yet). WriteFile already
                # places the data in the pipe's outbound buffer; the kernel
                # delivers it on the client's next ReadFile.
                ok = _kernel32.WriteFile(
                    self._handle,
                    buf,
                    len(data),
                    ctypes.byref(written),
                    None,
                )
                if not ok:
                    err = ctypes.get_last_error()
                    raise OSError(err, "WriteFile failed")

        def close(self) -> None:
            with self._lock:
                if self._closed:
                    return
                self._closed = True
                handle = self._handle
                self._handle = None
            if handle is None:
                return
            try:
                _kernel32.DisconnectNamedPipe(handle)
            except Exception:  # noqa: BLE001 - best-effort
                pass
            try:
                _kernel32.CloseHandle(handle)
            except Exception:  # noqa: BLE001 - best-effort
                pass

else:

    class _PosixFifo:
        def __init__(self, workdir: str) -> None:
            self.path: str = os.path.join(workdir, "stdin.fifo")
            os.mkfifo(self.path, 0o600)
            self._writer_fd: Optional[int] = None
            self._opened = threading.Event()
            self._open_error: Optional[OSError] = None
            self._open_thread: Optional[threading.Thread] = None
            self._closed = False
            self._lock = threading.Lock()

        def start(self) -> None:
            def _open_writer() -> None:
                try:
                    # Blocks until the inferior opens the FIFO for read.
                    self._writer_fd = os.open(self.path, os.O_WRONLY)
                except OSError as exc:
                    self._open_error = exc
                self._opened.set()

            self._open_thread = threading.Thread(
                target=_open_writer, daemon=True
            )
            self._open_thread.start()

        def write_blocking(self, data: bytes, *, connect_timeout: float) -> None:
            if not data:
                return
            if not self._opened.wait(timeout=connect_timeout):
                raise TimeoutError(
                    "Stdin FIFO never opened by inferior process"
                )
            if self._open_error is not None:
                raise self._open_error
            with self._lock:
                if self._writer_fd is None or self._closed:
                    raise BrokenPipeError("Stdin FIFO closed")
                view = memoryview(data)
                while view:
                    n = os.write(self._writer_fd, view)
                    view = view[n:]

        def close(self) -> None:
            with self._lock:
                if self._closed:
                    return
                self._closed = True
                fd = self._writer_fd
                self._writer_fd = None
            if fd is not None:
                try:
                    os.close(fd)
                except OSError:
                    pass
            try:
                os.unlink(self.path)
            except OSError:
                pass
