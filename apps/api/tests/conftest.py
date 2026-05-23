"""Shared pytest fixtures + toolchain detection helpers."""
from __future__ import annotations

import shutil

import pytest

from app.core.rate_limit import execute_limiter


def _has(*tools: str) -> bool:
    return all(shutil.which(t) is not None for t in tools)


HAS_GCC = _has("gcc", "gdb")
HAS_GPP = _has("g++", "gdb")
HAS_JDK = _has("javac", "java")


def pytest_collection_modifyitems(config, items):  # type: ignore[no-untyped-def]
    skip_gcc = pytest.mark.skip(reason="gcc/gdb not on PATH")
    skip_gpp = pytest.mark.skip(reason="g++/gdb not on PATH")
    skip_jdk = pytest.mark.skip(reason="javac/java not on PATH")
    for item in items:
        if "requires_gcc" in item.keywords and not HAS_GCC:
            item.add_marker(skip_gcc)
        if "requires_gpp" in item.keywords and not HAS_GPP:
            item.add_marker(skip_gpp)
        if "requires_jdk" in item.keywords and not HAS_JDK:
            item.add_marker(skip_jdk)


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    """Don't let one test's rate-limit budget leak into another."""
    execute_limiter.reset()
    yield
    execute_limiter.reset()
