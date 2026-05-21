"""
Server-Sent Events execution endpoint.

POST /api/v1/execute/stream                  -> SSE stream of EngineEvent
POST /api/v1/execute/input/{session_id}      -> deliver stdin to a waiting tracer
POST /api/v1/execute/cancel/{session_id}     -> cancel an in-flight session

Phase 1: only the `mock` language is wired. The C/C++/Java tracers will plug
into the same dispatch shape in later phases.
"""
from __future__ import annotations

import asyncio
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from ..core.session_bus import bus
from ..schemas.execution import (
    EngineEvent,
    EventDone,
    EventOutput,
    EventReady,
    EventStep,
    ExecutionState,
    PrimitiveValue,
    StackFrame,
    event_to_json,
)
from ..schemas.requests import ExecuteRequest, InputRequest
from ..tracers.java_tracer import stream_java_execution
from ..tracers.native_tracer import stream_native_execution

router = APIRouter(prefix="/api/v1/execute", tags=["execution"])


async def _mock_stream(req: ExecuteRequest, session_id: str) -> AsyncIterator[EngineEvent]:
    """Deterministic event stream used to validate the SSE contract end-to-end."""
    yield EventReady()
    await asyncio.sleep(0.1)

    yield EventOutput(value=f"[mock {req.language} runner started]\n")

    line_count = max(1, min(req.code.count("\n") + 1, 12))
    for step_idx in range(line_count):
        await asyncio.sleep(0.15)
        state = ExecutionState(
            step=step_idx,
            line=step_idx + 1,
            event="line",
            description=f"Mock step {step_idx + 1} of {line_count}",
            frames=[
                StackFrame(
                    name="<module>",
                    line=step_idx + 1,
                    locals={
                        "i": PrimitiveValue(type="int", value=step_idx),
                        "lang": PrimitiveValue(type="str", value=req.language),
                    },
                    isGlobal=True,
                )
            ],
            heap={},
            stdout="",
            changedVars=["i"],
        )
        yield EventStep(state=state)
        yield EventOutput(value=f"step {step_idx + 1}\n")

    await asyncio.sleep(0.1)
    yield EventDone()


async def _stream_events(req: ExecuteRequest, session_id: str) -> AsyncIterator[EngineEvent]:
    if req.language == "mock":
        async for event in _mock_stream(req, session_id):
            yield event
        return

    if req.language in {"c", "cpp"}:
        async for event in stream_native_execution(
            req.code,
            language=req.language,
            step_budget=req.options.step_budget,
            stdin=req.stdin,
        ):
            yield event
        return

    if req.language == "java":
        async for event in stream_java_execution(
            req.code,
            step_budget=req.options.step_budget,
            stdin=req.stdin,
            session_id=session_id,
        ):
            yield event
        return

    yield EventReady()
    yield EventOutput(
        value=(
            f"[backend stub] {req.language} tracer not yet implemented.\n"
            "This endpoint is wired up; the language tracer ships in a later phase.\n"
        )
    )
    yield EventDone()


@router.post("/stream")
async def execute_stream(req: ExecuteRequest, request: Request) -> EventSourceResponse:
    session_id = bus.new_session()

    async def event_generator() -> AsyncIterator[dict[str, str]]:
        try:
            async for event in _stream_events(req, session_id):
                if await request.is_disconnected():
                    break
                yield {"event": "message", "data": event_to_json(event)}
        finally:
            bus.end(session_id)

    return EventSourceResponse(
        event_generator(),
        headers={"X-Session-Id": session_id},
    )


@router.post("/input/{session_id}")
def deliver_input(session_id: str, body: InputRequest) -> dict[str, str]:
    if not bus.deliver(session_id, body.value):
        raise HTTPException(status_code=404, detail="Unknown or closed session")
    return {"status": "delivered"}


@router.post("/cancel/{session_id}")
def cancel_session(session_id: str) -> dict[str, str]:
    bus.end(session_id)
    return {"status": "cancelled"}
