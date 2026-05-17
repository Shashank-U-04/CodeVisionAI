"""
Pydantic schemas mirroring packages/visualizer-engine/src/types.ts.
The TypeScript discriminated union semantics map to Pydantic models with a
`type`/`kind` literal discriminator. Output JSON must serialize identically
to what the Pyodide worker produces so the frontend stays language-agnostic.
"""
from __future__ import annotations

from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, ConfigDict, Field

PrimitiveType = Literal["int", "float", "str", "bool", "None"]


class PrimitiveValue(BaseModel):
    model_config = ConfigDict(frozen=True)
    kind: Literal["primitive"] = "primitive"
    type: PrimitiveType
    value: Union[str, int, float, bool, None]


class RefValue(BaseModel):
    model_config = ConfigDict(frozen=True)
    kind: Literal["ref"] = "ref"
    id: int


StackValue = Annotated[
    Union[PrimitiveValue, RefValue],
    Field(discriminator="kind"),
]


class ListObject(BaseModel):
    type: Literal["list"] = "list"
    id: int
    elements: list[StackValue]


class TupleObject(BaseModel):
    type: Literal["tuple"] = "tuple"
    id: int
    elements: list[StackValue]


class DictObject(BaseModel):
    type: Literal["dict"] = "dict"
    id: int
    pairs: list[tuple[StackValue, StackValue]]


class SetObject(BaseModel):
    type: Literal["set"] = "set"
    id: int
    elements: list[StackValue]


class FunctionObject(BaseModel):
    type: Literal["function"] = "function"
    id: int
    name: str


class ClassObject(BaseModel):
    type: Literal["class"] = "class"
    id: int
    name: str


class InstanceObject(BaseModel):
    type: Literal["instance"] = "instance"
    id: int
    className: str
    attrs: dict[str, StackValue]


HeapObject = Annotated[
    Union[
        ListObject,
        TupleObject,
        DictObject,
        SetObject,
        FunctionObject,
        ClassObject,
        InstanceObject,
    ],
    Field(discriminator="type"),
]


class StackFrame(BaseModel):
    name: str
    line: int
    locals: dict[str, StackValue]
    isGlobal: bool
    returnValue: StackValue | None = None


TraceEvent = Literal["call", "line", "return", "exception"]


class ExecutionState(BaseModel):
    step: int
    line: int
    event: TraceEvent
    description: str
    frames: list[StackFrame]
    heap: dict[int, HeapObject]
    stdout: str
    changedVars: list[str]


class EventReady(BaseModel):
    type: Literal["READY"] = "READY"


class EventStep(BaseModel):
    type: Literal["STEP"] = "STEP"
    state: ExecutionState


class EventOutput(BaseModel):
    type: Literal["OUTPUT"] = "OUTPUT"
    value: str


class EventInputRequest(BaseModel):
    type: Literal["INPUT_REQUEST"] = "INPUT_REQUEST"
    prompt: str
    sessionId: str


class EventDone(BaseModel):
    type: Literal["DONE"] = "DONE"


class EventError(BaseModel):
    type: Literal["ERROR"] = "ERROR"
    message: str
    line: int | None = None


EngineEvent = Annotated[
    Union[
        EventReady,
        EventStep,
        EventOutput,
        EventInputRequest,
        EventDone,
        EventError,
    ],
    Field(discriminator="type"),
]


def event_to_json(event: BaseModel) -> str:
    """Single canonical event-to-SSE-data serializer used by every route.

    `exclude_none=True` drops optional fields whose value is `None`, matching
    what the in-browser Pyodide tracer emits. The frontend treats absent
    `returnValue` and absent `line` as "not present"; without this flag we'd
    serialize them as JSON `null` and crash components that key on
    `value !== undefined`.
    """
    return event.model_dump_json(exclude_none=True)


__all__ = [
    "PrimitiveType",
    "PrimitiveValue",
    "RefValue",
    "StackValue",
    "ListObject",
    "TupleObject",
    "DictObject",
    "SetObject",
    "FunctionObject",
    "ClassObject",
    "InstanceObject",
    "HeapObject",
    "StackFrame",
    "TraceEvent",
    "ExecutionState",
    "EventReady",
    "EventStep",
    "EventOutput",
    "EventInputRequest",
    "EventDone",
    "EventError",
    "EngineEvent",
    "event_to_json",
]
