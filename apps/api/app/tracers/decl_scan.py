"""Declaration-line scanning for C/C++ locals.

GDB reports every local that is lexically in scope for a frame, regardless of
whether execution has reached its declaration yet. For a function like

    int main(void) {
        int a = 10;      // line 2
        int f = fact(4); // line 3
    }

a snapshot taken at line 2 lists both `a` and `f`, and `f` holds whatever
garbage was on the stack. That is technically true of C but actively misleading
to someone learning to read a call stack, so we suppress a local until
execution has moved past the line that introduces it.

DWARF does carry decl_line, but GDB's MI interface does not expose it for
locals, so the declaration line is recovered from the source text instead.
The scan is deliberately conservative: anything it cannot attribute is left
visible, so a parsing miss degrades to today's behavior rather than hiding a
variable the learner needs to see.
"""
from __future__ import annotations

import re

# `int main(void) {`, `int factorial(int n) {`, `void f(char *s)` + `{` on the
# next line. Deliberately loose — it only needs to find where top-level
# function bodies begin, not to validate C.
_FUNC_RE = re.compile(
    r"^[A-Za-z_][\w \t\*&:<>,~]*?([A-Za-z_]\w*)\s*\([^;]*?\)\s*(?:const\s*)?\{?\s*$"
)
_IDENT_RE = re.compile(r"[A-Za-z_]\w*")

# Identifiers that are never user locals; keeps the per-function maps small
# and avoids a keyword shadowing a variable name of the same spelling.
_KEYWORDS = frozenset(
    """
    alignas alignof and auto bool break case catch char class const constexpr
    continue decltype default delete do double dynamic_cast else enum explicit
    export extern false float for friend goto if inline int long mutable
    namespace new noexcept not nullptr operator or private protected public
    register reinterpret_cast restrict return short signed sizeof static
    static_cast struct switch template this throw true try typedef typeid
    typename union unsigned using virtual void volatile wchar_t while xor
    """.split()
)


def _strip_comments(code: str) -> str:
    """Blank out comment and string bodies, preserving line structure.

    Identifiers inside a comment or a string literal must not be mistaken for
    a declaration, but line numbers have to stay aligned with the original, so
    content is replaced with spaces rather than removed.
    """
    out: list[str] = []
    i, n = 0, len(code)
    state = "code"  # code | line_comment | block_comment | string | char
    while i < n:
        ch = code[i]
        nxt = code[i + 1] if i + 1 < n else ""
        if state == "code":
            if ch == "/" and nxt == "/":
                state, i = "line_comment", i + 2
                out.append("  ")
                continue
            if ch == "/" and nxt == "*":
                state, i = "block_comment", i + 2
                out.append("  ")
                continue
            if ch == '"':
                state = "string"
                out.append(" ")
                i += 1
                continue
            if ch == "'":
                state = "char"
                out.append(" ")
                i += 1
                continue
            out.append(ch)
            i += 1
            continue

        if state == "line_comment":
            if ch == "\n":
                state = "code"
                out.append("\n")
            else:
                out.append(" ")
            i += 1
            continue

        if state == "block_comment":
            if ch == "*" and nxt == "/":
                state, i = "code", i + 2
                out.append("  ")
                continue
            out.append("\n" if ch == "\n" else " ")
            i += 1
            continue

        # string / char literal
        if ch == "\\":
            out.append("  ")
            i += 2
            continue
        if (state == "string" and ch == '"') or (state == "char" and ch == "'"):
            state = "code"
            out.append(" ")
            i += 1
            continue
        out.append("\n" if ch == "\n" else " ")
        i += 1
    return "".join(out)


def build_decl_map(code: str) -> dict[str, dict[str, int]]:
    """Map function name -> {identifier: first line it appears on}.

    Lines are 1-based and match what GDB reports, because the compiled unit
    carries `#line 1 "<virtual>"` immediately before the user's code.

    The empty-string key holds a whole-file fallback used when a frame's
    function can't be located (e.g. a name-mangled C++ member).
    """
    cleaned = _strip_comments(code)
    lines = cleaned.split("\n")

    # Locate top-level function bodies by tracking brace depth.
    ranges: list[tuple[str, int, int]] = []  # (name, start_line, end_line)
    depth = 0
    pending: str | None = None
    current: tuple[str, int] | None = None

    for idx, raw in enumerate(lines, start=1):
        if depth == 0 and current is None:
            match = _FUNC_RE.match(raw.strip())
            if match:
                pending = match.group(1)

        opens = raw.count("{")
        closes = raw.count("}")

        if depth == 0 and opens and pending:
            current = (pending, idx)
            pending = None

        depth += opens - closes
        if depth < 0:
            depth = 0

        if current is not None and depth == 0 and closes:
            ranges.append((current[0], current[1], idx))
            current = None
    if current is not None:
        ranges.append((current[0], current[1], len(lines)))

    def first_lines(start: int, end: int) -> dict[str, int]:
        found: dict[str, int] = {}
        for lineno in range(start, min(end, len(lines)) + 1):
            for ident in _IDENT_RE.findall(lines[lineno - 1]):
                if ident in _KEYWORDS:
                    continue
                found.setdefault(ident, lineno)
        return found

    result: dict[str, dict[str, int]] = {"": first_lines(1, len(lines))}
    for name, start, end in ranges:
        # A function defined twice (overloads) keeps the first body seen; the
        # fallback map still covers anything missed.
        result.setdefault(name, first_lines(start, end))
    return result


def is_visible(
    decl_map: dict[str, dict[str, int]],
    func: str,
    var: str,
    current_line: int,
) -> bool:
    """True when `var` should be shown for a frame of `func` stopped at `current_line`.

    A variable becomes visible only once execution has moved *past* the line
    that introduces it — while stopped on `int f = g();`, `f` is not yet
    assigned. Unknown variables stay visible so a scan miss can't hide state.
    """
    scope = decl_map.get(func) or decl_map.get("") or {}
    decl_line = scope.get(var)
    if decl_line is None:
        return True
    return decl_line < current_line
