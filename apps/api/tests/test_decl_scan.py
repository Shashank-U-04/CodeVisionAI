"""Unit tests for the C/C++ declaration-line scanner.

The scanner decides when a local becomes visible in a snapshot. Its contract
is deliberately asymmetric: hiding a variable that should be shown is a real
regression, while showing one it can't place is acceptable degradation.
"""
from __future__ import annotations

from app.tracers.decl_scan import build_decl_map, is_visible

C_SRC = """\
#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main(void) {
    int a = 10;
    int b = a * 2;
    int f = factorial(4);
    printf("%d %d\\n", b, f);
    return 0;
}
"""


def test_locals_hidden_until_execution_passes_declaration():
    dm = build_decl_map(C_SRC)
    # Stopped ON `int a = 10;` (line 9): nothing in main is assigned yet.
    assert not is_visible(dm, "main", "a", 9)
    assert not is_visible(dm, "main", "b", 9)
    assert not is_visible(dm, "main", "f", 9)

    # Stopped on line 10: `a` has run, `b` and `f` have not.
    assert is_visible(dm, "main", "a", 10)
    assert not is_visible(dm, "main", "b", 10)
    assert not is_visible(dm, "main", "f", 10)

    # Stopped on line 12 (the printf): all three are live.
    assert is_visible(dm, "main", "a", 12)
    assert is_visible(dm, "main", "b", 12)
    assert is_visible(dm, "main", "f", 12)


def test_parameters_visible_immediately_inside_the_body():
    dm = build_decl_map(C_SRC)
    # `n` is declared on the signature line (3), so it is live at line 4.
    assert is_visible(dm, "factorial", "n", 4)
    assert is_visible(dm, "factorial", "n", 5)


def test_same_name_in_two_functions_is_scoped_per_function():
    src = """\
void first(void) {
    int i = 1;
    printf("%d", i);
}

void second(void) {
    int j = 0;
    int i = 5;
    printf("%d", i);
}
"""
    dm = build_decl_map(src)
    # `i` in `second` is declared on line 8; the line-2 `i` in `first` must not
    # leak across and reveal it early.
    assert not is_visible(dm, "second", "i", 7)
    assert is_visible(dm, "second", "i", 9)
    assert is_visible(dm, "first", "i", 3)


def test_unknown_variable_stays_visible():
    dm = build_decl_map(C_SRC)
    # A compiler-introduced temporary the scan never saw must not be hidden.
    assert is_visible(dm, "main", "__some_temp", 1)
    assert is_visible(dm, "no_such_function", "whatever", 1)


def test_identifiers_in_comments_and_strings_are_ignored():
    src = """\
int main(void) {
    /* zzz appears here first, in a comment */
    printf("zzz in a string");
    int zzz = 3;
    return zzz;
}
"""
    dm = build_decl_map(src)
    # If the comment (line 2) or string (line 3) counted, `zzz` would appear
    # live at line 4 while still holding garbage.
    assert not is_visible(dm, "main", "zzz", 4)
    assert is_visible(dm, "main", "zzz", 5)


def test_cpp_method_bodies_are_scanned():
    src = """\
#include <iostream>

int square(int n) {
    int r = n * n;
    return r;
}

int main() {
    int total = 0;
    total += square(2);
    return total;
}
"""
    dm = build_decl_map(src)
    assert not is_visible(dm, "square", "r", 4)
    assert is_visible(dm, "square", "r", 5)
    assert is_visible(dm, "square", "n", 4)
    assert not is_visible(dm, "main", "total", 9)
    assert is_visible(dm, "main", "total", 10)
