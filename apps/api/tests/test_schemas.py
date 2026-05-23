"""Pydantic schema boundary tests for ExecuteRequest / InputRequest."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.requests import ExecuteOptions, ExecuteRequest, InputRequest


def test_execute_request_accepts_minimal():
    req = ExecuteRequest(language="mock", code="x")
    assert req.language == "mock"
    assert req.stdin == ""
    assert req.options.step_budget == 2000


def test_execute_request_rejects_unknown_language():
    with pytest.raises(ValidationError):
        ExecuteRequest(language="brainfuck", code="x")  # type: ignore[arg-type]


def test_execute_request_rejects_empty_code():
    with pytest.raises(ValidationError):
        ExecuteRequest(language="mock", code="")


def test_execute_request_caps_code_size():
    over = "x" * 64_001
    with pytest.raises(ValidationError):
        ExecuteRequest(language="mock", code=over)


def test_execute_request_caps_stdin_size():
    big = "x" * 16_001
    with pytest.raises(ValidationError):
        ExecuteRequest(language="mock", code="x", stdin=big)


def test_execute_options_bounds():
    with pytest.raises(ValidationError):
        ExecuteOptions(step_budget=0)
    with pytest.raises(ValidationError):
        ExecuteOptions(step_budget=10_001)
    with pytest.raises(ValidationError):
        ExecuteOptions(timeout_ms=50)
    with pytest.raises(ValidationError):
        ExecuteOptions(timeout_ms=30_001)


def test_input_request_size_cap():
    InputRequest(value="x" * 8192)  # boundary case is allowed
    with pytest.raises(ValidationError):
        InputRequest(value="x" * 8193)
