"""
Parse raw GDB MI value strings into PrimitiveValue / RefValue.

GDB returns values as already-rendered strings, e.g.:
    "1"
    "1.5"
    "0x401000"
    "0x401000 \"hello\""        # pointer to string literal
    "{a = 1, b = 2}"            # struct, handled as a primitive str for Phase 2
    "0x0"                       # NULL pointer
We don't try to be exhaustive; anything we don't recognize becomes a `str`
primitive so the UI shows the raw GDB rendering. Heap-side struct decoding
arrives in a later phase.
"""
from __future__ import annotations

import re

from ..schemas.execution import PrimitiveValue, RefValue, StackValue

_INT_RE = re.compile(r"^-?\d+$")
_FLOAT_RE = re.compile(r"^-?\d+\.\d+(?:[eE][+-]?\d+)?$")
_HEX_RE = re.compile(r"^0x[0-9a-fA-F]+$")
_PTR_AND_STRING_RE = re.compile(r'^(0x[0-9a-fA-F]+)\s+"(.*)"$')


def parse_value(raw: str | None, ctype: str | None = None) -> StackValue:
    if raw is None:
        return PrimitiveValue(type="None", value=None)

    raw = raw.strip()

    # Pointer + dereferenced C-string ("0x401000 "hello"")
    if (m := _PTR_AND_STRING_RE.match(raw)) is not None:
        return PrimitiveValue(type="str", value=m.group(2))

    if _INT_RE.match(raw):
        return PrimitiveValue(type="int", value=int(raw))

    if _FLOAT_RE.match(raw):
        return PrimitiveValue(type="float", value=float(raw))

    if _HEX_RE.match(raw):
        addr = int(raw, 16)
        if addr == 0:
            return PrimitiveValue(type="None", value=None)
        return RefValue(id=addr)

    # Booleans (only when the type column told us so; GDB usually returns 0/1)
    if ctype and ctype.lower() in {"_bool", "bool"} and raw in {"0", "1"}:
        return PrimitiveValue(type="bool", value=raw == "1")

    return PrimitiveValue(type="str", value=raw)
