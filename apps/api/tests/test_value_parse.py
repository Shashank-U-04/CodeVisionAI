"""Unit tests for GDB value -> StackValue/heap decoding."""
from __future__ import annotations

from app.schemas.execution import HeapObject
from app.tracers.value_parse import parse_value


def _heap() -> dict[int, HeapObject]:
    return {}


def test_scalars():
    assert parse_value("42").value == 42
    assert parse_value("42").type == "int"
    assert parse_value("-1.5").value == -1.5
    assert parse_value("-1.5").type == "float"
    assert parse_value(None).type == "None"
    assert parse_value("1", "bool").value is True
    assert parse_value("0", "_Bool").value is False


def test_null_pointer_is_none_and_non_null_shows_address():
    assert parse_value("0x0").type == "None"
    # A pointer with no materialized target must NOT become a RefValue: there
    # would be no heap entry behind it and the UI would draw a dangling arrow.
    v = parse_value("0x401000")
    assert v.kind == "primitive"
    assert v.value == "0x401000"


def test_char_pointer_and_char_array_render_as_strings():
    assert parse_value('0x401000 "hello"').value == "hello"
    assert parse_value('"world"').value == "world"


def test_array_becomes_heap_list():
    heap = _heap()
    v = parse_value("{1, 2, 3}", "int [3]", heap=heap, path="main@0.arr")
    assert v.kind == "ref"
    obj = heap[v.id]
    assert obj.type == "list"
    assert [e.value for e in obj.elements] == [1, 2, 3]


def test_struct_becomes_heap_instance_with_named_attrs():
    heap = _heap()
    v = parse_value("{x = 1, y = 2}", "struct Point", heap=heap, path="main@0.p")
    obj = heap[v.id]
    assert obj.type == "instance"
    assert obj.className == "Point"
    assert obj.attrs["x"].value == 1
    assert obj.attrs["y"].value == 2


def test_array_of_structs_nests_heap_objects():
    heap = _heap()
    v = parse_value(
        "{{x = 1, y = 2}, {x = 3, y = 4}}",
        "Point [2]",
        heap=heap,
        path="main@0.pts",
    )
    outer = heap[v.id]
    assert outer.type == "list"
    assert len(outer.elements) == 2
    inner = heap[outer.elements[1].id]
    assert inner.type == "instance"
    assert inner.attrs["x"].value == 3
    assert inner.className == "Point"


def test_repeats_elision_is_expanded():
    heap = _heap()
    v = parse_value("{0 <repeats 5 times>}", "int [5]", heap=heap, path="main@0.z")
    assert [e.value for e in heap[v.id].elements] == [0, 0, 0, 0, 0]


def test_ids_are_stable_for_the_same_path_and_differ_across_paths():
    a = parse_value("{1}", "int [1]", heap=_heap(), path="main@0.arr")
    b = parse_value("{9}", "int [1]", heap=_heap(), path="main@0.arr")
    c = parse_value("{1}", "int [1]", heap=_heap(), path="main@0.other")
    # Same variable keeps its identity across steps even as contents change...
    assert a.id == b.id
    # ...and two different variables never collide onto one heap box.
    assert a.id != c.id


def test_recursion_frames_get_distinct_ids():
    # factorial@1 and factorial@2 are different live frames, so their locals
    # must be distinct heap objects rather than aliasing one box.
    x = parse_value("{1}", "int [1]", heap=_heap(), path="factorial@1.buf")
    y = parse_value("{1}", "int [1]", heap=_heap(), path="factorial@2.buf")
    assert x.id != y.id


def test_aggregate_without_heap_degrades_to_string():
    v = parse_value("{x = 1}", "struct Point")
    assert v.kind == "primitive"
    assert v.value == "{x = 1}"


def test_string_containing_comma_is_not_split():
    heap = _heap()
    v = parse_value('{name = "a, b", n = 2}', "struct S", heap=heap, path="p")
    obj = heap[v.id]
    assert obj.attrs["name"].value == "a, b"
    assert obj.attrs["n"].value == 2


def test_empty_aggregate():
    heap = _heap()
    v = parse_value("{}", "int [0]", heap=heap, path="p")
    assert heap[v.id].elements == []


def test_deep_nesting_is_bounded():
    heap = _heap()
    deep = "{a = " * 8 + "1" + "}" * 8
    # Must terminate and stay representable rather than recursing forever.
    parse_value(deep, "struct S", heap=heap, path="p")
    assert len(heap) <= 8
