from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Language = Literal["mock", "c", "cpp", "java"]


class ExecuteOptions(BaseModel):
    step_budget: int = Field(default=2000, ge=1, le=10_000)
    timeout_ms: int = Field(default=5000, ge=100, le=30_000)


class ExecuteRequest(BaseModel):
    language: Language
    code: str = Field(min_length=1, max_length=64_000)
    stdin: str = ""
    options: ExecuteOptions = ExecuteOptions()


class InputRequest(BaseModel):
    value: str = Field(max_length=8192)
