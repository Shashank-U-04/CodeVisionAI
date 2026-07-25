"""
Parse raw GDB MI value strings into PrimitiveValue / RefValue (+ heap objects).

GDB returns values as already-rendered strings, e.g.:
    "1"
    "1.5"
    "0x401000"
    "0x401000 \"hello\""            # pointer to string literal
    "{1, 2, 3}"                     # array          -> heap list
    "{x = 1, y = 2}"                # struct         -> heap instance
    "{{x = 1}, {x = 2}}"            # array of structs (nested)
    "{0 <repeats 16 times>}"        # run-length elision
    "0x0"                           # NULL pointer

Aggregates become heap objects so the visualization panel can render them as
boxes with reference arrows, the same way the Python tracer represents lists
and class instances. Anything unrecognized degrades to a `str` primitive
holding GDB's own rendering, so an unusual type shows raw rather than breaking.

Heap ids are derived from the variable's *path* (frame index + field trail)
rather than a memory address, because GDB does not report the address of an
aggregate in its value string. Path-derived ids are stable across steps, which
is what the UI needs to keep an object's identity (and its arrows) steady as
execution proceeds.
"""
from __future__ import annotations

import re

from ..schemas.execution import (
    HeapObject,
    InstanceObject,
    ListObject,
    PrimitiveValue,
    RefValue,
    StackValue,
)

_INT_RE = re.compile(r"^-?\d+$")
_FLOAT_RE = re.compile(r"^-?\d+\.\d+(?:[eE][+-]?\d+)?$")
_HEX_RE = re.compile(r"^0x[0-9a-fA-F]+$")
_PTR_AND_STRING_RE = re.compile(r'^(0x[0-9a-fA-F]+)\s+"(.*)"$')
_QUOTED_RE = re.compile(r'^"(.*)"$', re.DOTALL)
_FIELD_RE = re.compile(r"^([A-Za-z_]\w*)\s*=\s*(.*)$", re.DOTALL)
_REPEATS_RE = re.compile(r"^(.*?)\s*<repeats (\d+) times>$", re.DOTALL)

# Mirrors the Python tracer's caps so one runaway array can't blow the payload.
MAX_ELEMENTS = 50
MAX_FIELDS = 50
MAX_DEPTH = 4

# Keeps synthetic ids inside a range that survives JSON round-tripping while
# staying clear of the small integers real addresses would occupy.
_ID_SPACE = 2_000_000_000


def _synth_id(path: str) -> int:
    """Deterministic positive id for a variable path, stable across steps."""
    h = 0
    for ch in path:
        h = (h * 131 + ord(ch)) & 0xFFFFFFFF
    return (h % _ID_SPACE) + 1


def _split_top_level(body: str) -> list[str]:
    """Split on commas at brace depth 0, honoring quoted sections."""
    parts: list[str] = []
    depth = 0
    in_string = False
    in_char = False
    escaped = False
    current: list[str] = []

    for ch in body:
        if escaped:
            current.append(ch)
            escaped = False
            continue
        if ch == "\\":
            current.append(ch)
            escaped = True
            continue
        if in_string:
            current.append(ch)
            if ch == '"':
                in_string = False
            continue
        if in_char:
            current.append(ch)
            if ch == "'":
                in_char = False
            continue
        if ch == '"':
            in_string = True
            current.append(ch)
            continue
        if ch == "'":
            in_char = True
            current.append(ch)
            continue
        if ch in "{[(":
            depth += 1
        elif ch in "}])":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append("".join(current).strip())
            current = []
            continue
        current.append(ch)

    tail = "".join(current).strip()
    if tail:
        parts.append(tail)
    return parts


def _expand_repeats(parts: list[str]) -> list[str]:
    """Turn GDB's `<repeats N times>` elision back into individual elements."""
    out: list[str] = []
    for part in parts:
        m = _REPEATS_RE.match(part)
        if m is None:
            out.append(part)
            continue
        value, count = m.group(1).strip(), int(m.group(2))
        out.extend([value] * min(count, MAX_ELEMENTS))
        if len(out) >= MAX_ELEMENTS:
            break
    return out


def _parse_aggregate(
    raw: str,
    ctype: str | None,
    heap: dict[int, HeapObject],
    path: str,
    depth: int,
) -> StackValue:
    body = raw[1:-1].strip()
    oid = _synth_id(path)

    if not body:
        heap[oid] = ListObject(id=oid, elements=[])
        return RefValue(id=oid)

    parts = _split_top_level(body)
    fields = [(m.group(1), m.group(2)) for p in parts if (m := _FIELD_RE.match(p))]

    # Every part shaped `name = value` means a struct/class; otherwise it's an
    # array. Requiring *all* parts to match avoids misreading an array whose
    # elements happen to contain '=' inside a nested rendering.
    if fields and len(fields) == len(parts):
        # Reserve the slot before recursing so a self-referential rendering
        # terminates instead of spinning.
        heap[oid] = InstanceObject(id=oid, className=_type_name(ctype), attrs={})
        attrs: dict[str, StackValue] = {}
        for name, value in fields[:MAX_FIELDS]:
            attrs[name] = parse_value(
                value, None, heap=heap, path=f"{path}.{name}", _depth=depth + 1
            )
        heap[oid] = InstanceObject(id=oid, className=_type_name(ctype), attrs=attrs)
        return RefValue(id=oid)

    heap[oid] = ListObject(id=oid, elements=[])
    # `Point [2]` means every element is a `Point`; carrying the element type
    # down keeps nested structs named instead of collapsing to "struct".
    element_type = _element_type(ctype)
    elements = [
        parse_value(part, element_type, heap=heap, path=f"{path}[{i}]", _depth=depth + 1)
        for i, part in enumerate(_expand_repeats(parts)[:MAX_ELEMENTS])
    ]
    heap[oid] = ListObject(id=oid, elements=elements)
    return RefValue(id=oid)


def _element_type(ctype: str | None) -> str | None:
    """`Point [2]` -> `Point`; `int [3][4]` -> `int [4]`. None when not an array."""
    if not ctype or "[" not in ctype:
        return None
    head, _, rest = ctype.partition("[")
    inner = rest.partition("]")[2].strip()
    base = head.strip()
    return f"{base} {inner}".strip() if inner else base


def _type_name(ctype: str | None) -> str:
    """Human-facing class name for a struct, from GDB's type column."""
    if not ctype:
        return "struct"
    name = ctype.strip()
    for prefix in ("struct ", "class ", "union "):
        if name.startswith(prefix):
            name = name[len(prefix):]
    # Drop array/pointer decoration: `Point [3]` -> `Point`, `Point *` -> `Point`
    name = name.split("[")[0].replace("*", "").strip()
    return name or "struct"


def parse_value(
    raw: str | None,
    ctype: str | None = None,
    *,
    heap: dict[int, HeapObject] | None = None,
    path: str = "",
    _depth: int = 0,
) -> StackValue:
    """Convert one GDB-rendered value into a StackValue.

    When `heap` is supplied, aggregates are decoded into heap objects and a
    RefValue is returned. Without it, aggregates stay a `str` primitive — the
    caller has nowhere to put the object, and emitting a RefValue pointing at
    a heap entry that does not exist would leave the UI with a dangling arrow.
    """
    if raw is None:
        return PrimitiveValue(type="None", value=None)

    raw = raw.strip()

    # Aggregates: arrays and structs.
    if raw.startswith("{") and raw.endswith("}"):
        if heap is None or _depth >= MAX_DEPTH:
            return PrimitiveValue(type="str", value=raw[:500])
        return _parse_aggregate(raw, ctype, heap, path or "v", _depth)

    # Pointer + dereferenced C-string ("0x401000 \"hello\"")
    if (m := _PTR_AND_STRING_RE.match(raw)) is not None:
        return PrimitiveValue(type="str", value=m.group(2))

    # A bare quoted string (char arrays render this way).
    if (m := _QUOTED_RE.match(raw)) is not None:
        return PrimitiveValue(type="str", value=m.group(1)[:500])

    # Bools must be checked before the int branch: GDB renders them as 0/1, so
    # an earlier int match would swallow them and `bool` never worked.
    if ctype and ctype.strip().lower() in {"_bool", "bool"} and raw in {"0", "1"}:
        return PrimitiveValue(type="bool", value=raw == "1")

    if _INT_RE.match(raw):
        return PrimitiveValue(type="int", value=int(raw))

    if _FLOAT_RE.match(raw):
        return PrimitiveValue(type="float", value=float(raw))

    if _HEX_RE.match(raw):
        if int(raw, 16) == 0:
            return PrimitiveValue(type="None", value=None)
        # A non-null pointer whose target we haven't materialized. Show the
        # address rather than a RefValue: there is no heap entry behind it, and
        # a ref with no object renders as an arrow into nothing.
        return PrimitiveValue(type="str", value=raw)

    return PrimitiveValue(type="str", value=raw[:500])
