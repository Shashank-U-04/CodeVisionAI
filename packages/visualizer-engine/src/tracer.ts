/**
 * Python tracer that runs inside Pyodide.
 * Separates primitive values from heap objects (matching Python Tutor semantics).
 *
 * Globals injected by the worker before running this code:
 *   __user_code__      : str
 *   __post_step__      : callable(json_str)
 *   __request_input__  : callable(prompt) -> str
 */
export const PYTHON_TRACER_CODE = `
import sys
import json
import builtins
import io as _io

# ─── stdout capture ───────────────────────────────────────────────────────

class _Output:
    def __init__(self):
        self.buf = ''
    def write(self, s):
        s = str(s)
        self.buf += s
        __post_step__(json.dumps({'type': 'OUTPUT', 'value': s}))
    def flush(self):
        pass
    def isatty(self):
        return False
    def fileno(self):
        raise _io.UnsupportedOperation('fileno')

_out = _Output()
sys.stdout = _out
sys.stderr = _out

# ─── input() override (blocks worker via Atomics in the JS layer) ─────────

def _custom_input(prompt=''):
    if prompt:
        _out.write(str(prompt))
    raw = __request_input__(str(prompt))
    if raw and raw[-1] == chr(10):
        raw = raw[:-1]
    # Echo what the user typed + newline (matches real Python REPL behavior)
    _out.write(raw + chr(10))
    return raw

builtins.input = _custom_input

# ─── tracking ─────────────────────────────────────────────────────────────

_step_count = [0]
_MAX_STEPS = 2000

# remembers each frame's locals from the previous step → diff for changedVars
_prev_frame_state = {}    # frame_id -> {var_name: serialized_value_str}

# return value captured on 'return' events — survives one step into the parent
_pending_return = {}      # frame_id -> StackValue dict

# ─── serialization: split stack values from heap objects ──────────────────

_PRIMITIVE_TYPES = (bool, int, float, str)

def _is_primitive(v):
    return v is None or isinstance(v, _PRIMITIVE_TYPES)

def _primitive_value(v):
    if v is None:
        return {'kind': 'primitive', 'type': 'None', 'value': None}
    if isinstance(v, bool):
        return {'kind': 'primitive', 'type': 'bool', 'value': v}
    if isinstance(v, int):
        return {'kind': 'primitive', 'type': 'int', 'value': v}
    if isinstance(v, float):
        return {'kind': 'primitive', 'type': 'float', 'value': v}
    if isinstance(v, str):
        return {'kind': 'primitive', 'type': 'str', 'value': v[:500]}
    return {'kind': 'primitive', 'type': 'None', 'value': None}

def _stack_value(v, heap):
    """Returns either an inline primitive or a heap reference, populating heap as needed."""
    if _is_primitive(v):
        return _primitive_value(v)
    oid = id(v)
    if oid not in heap:
        # Reserve slot first so circular refs terminate
        heap[oid] = {'type': 'unknown', 'id': oid}
        try:
            heap[oid] = _build_heap_object(v, oid, heap)
        except Exception:
            heap[oid] = {'type': 'unknown', 'id': oid}
    return {'kind': 'ref', 'id': oid}

def _build_heap_object(v, oid, heap):
    if isinstance(v, list):
        return {
            'type': 'list',
            'id': oid,
            'elements': [_stack_value(x, heap) for x in v[:50]],
        }
    if isinstance(v, tuple):
        return {
            'type': 'tuple',
            'id': oid,
            'elements': [_stack_value(x, heap) for x in v[:50]],
        }
    if isinstance(v, dict):
        pairs = []
        for k, val in list(v.items())[:50]:
            pairs.append([_stack_value(k, heap), _stack_value(val, heap)])
        return {'type': 'dict', 'id': oid, 'pairs': pairs}
    if isinstance(v, (set, frozenset)):
        return {
            'type': 'set',
            'id': oid,
            'elements': [_stack_value(x, heap) for x in list(v)[:50]],
        }
    if isinstance(v, type):
        return {'type': 'class', 'id': oid, 'name': v.__name__}
    if callable(v):
        return {'type': 'function', 'id': oid, 'name': getattr(v, '__name__', '?')}
    # Fallback: treat as a class instance — collect attributes from __dict__
    attrs = {}
    if hasattr(v, '__dict__'):
        for k, val in list(v.__dict__.items())[:50]:
            if not k.startswith('_'):
                attrs[k] = _stack_value(val, heap)
    return {
        'type': 'instance',
        'id': oid,
        'className': type(v).__name__,
        'attrs': attrs,
    }

# ─── frame collection ─────────────────────────────────────────────────────

_FILTER_KEYS = frozenset([
    '__builtins__', '__doc__', '__name__', '__package__',
    '__spec__', '__loader__', '__annotations__', '__cached__',
])

def _frame_locals_filtered(frame):
    out = {}
    for k, val in list(frame.f_locals.items()):
        if k.startswith('_') or k in _FILTER_KEYS:
            continue
        out[k] = val
    return out

def _stable_key(frame):
    """A key that survives frame mutations across the same call."""
    return (id(frame), frame.f_code.co_name)

def _serialize_frame(frame, heap, changed_paths, frame_idx):
    fname = frame.f_code.co_name
    is_global = fname == '<module>'
    display_name = 'Global' if is_global else fname

    locs_raw = _frame_locals_filtered(frame)
    locs = {}
    for k, v in locs_raw.items():
        locs[k] = _stack_value(v, heap)

    # diff against previous snapshot to compute changedVars
    fk = _stable_key(frame)
    prev = _prev_frame_state.get(fk, {})
    cur = {k: json.dumps(v, sort_keys=True) for k, v in locs.items()}
    for k, v_str in cur.items():
        if prev.get(k) != v_str:
            changed_paths.append(str(frame_idx) + '.' + k)
    _prev_frame_state[fk] = cur

    frame_obj = {
        'name': display_name,
        'line': frame.f_lineno,
        'locals': locs,
        'isGlobal': is_global,
    }

    # Attach return value if we just saw 'return' on this exact frame
    rv = _pending_return.pop(fk, None)
    if rv is not None:
        frame_obj['returnValue'] = rv
        changed_paths.append(str(frame_idx) + '.__return__')

    return frame_obj

def _collect_frames(top_frame, heap, changed_paths):
    chain = []
    f = top_frame
    while f is not None:
        if f.f_code.co_filename == '<string>':
            chain.append(f)
        f = f.f_back
    chain.reverse()  # oldest first
    return [_serialize_frame(fr, heap, changed_paths, i) for i, fr in enumerate(chain)]

# ─── description generation ───────────────────────────────────────────────

def _describe(frame, event, arg):
    fname = frame.f_code.co_name
    if fname == '<module>':
        fname = 'module'
    line = frame.f_lineno

    if event == 'call':
        # Build "fname(arg1=v1, arg2=v2)" from the positional argument names
        try:
            argcount = frame.f_code.co_argcount
            argnames = frame.f_code.co_varnames[:argcount]
            parts = []
            for an in argnames:
                if an in frame.f_locals:
                    parts.append(an + '=' + _short_repr(frame.f_locals[an]))
            sig = '(' + ', '.join(parts) + ')'
        except Exception:
            sig = '()'
        return 'Calling ' + fname + sig
    if event == 'return':
        try:
            r = _short_repr(arg)
        except Exception:
            r = '?'
        return 'Returning from ' + fname + '() → ' + r
    if event == 'exception':
        return 'Exception at line ' + str(line) + ' in ' + fname + '()'
    return 'Executing line ' + str(line) + ' in ' + fname + '()'

def _short_repr(v, limit=40):
    try:
        if isinstance(v, str):
            r = repr(v)
        else:
            r = repr(v)
        if len(r) > limit:
            r = r[:limit] + '…'
        return r
    except Exception:
        return '?'

# ─── trace function ───────────────────────────────────────────────────────

def _trace(frame, event, arg):
    if frame.f_code.co_filename != '<string>':
        return _trace

    if _step_count[0] >= _MAX_STEPS:
        __post_step__(json.dumps({
            'type': 'ERROR',
            'message': 'Execution stopped: exceeded ' + str(_MAX_STEPS) + ' steps (possible infinite loop).',
            'line': frame.f_lineno,
        }))
        raise SystemExit(0)

    _step_count[0] += 1

    if event == 'return':
        # Stash the return value so the next snapshot can show it
        _pending_return[_stable_key(frame)] = _stack_value(arg, _peek_heap_local()) if False else None
        # We need a real heap to serialize into — do a full snapshot below

    if event in ('call', 'line', 'return', 'exception'):
        try:
            heap = {}
            changed_paths = []

            # If 'return', record return value into the pending map BEFORE serialization
            if event == 'return':
                _pending_return[_stable_key(frame)] = _stack_value(arg, heap)

            frames = _collect_frames(frame, heap, changed_paths)
            description = _describe(frame, event, arg)

            snapshot = {
                'type': 'STEP',
                'state': {
                    'step': _step_count[0],
                    'line': frame.f_lineno,
                    'event': event,
                    'description': description,
                    'frames': frames,
                    'heap': heap,
                    'stdout': _out.buf,
                    'changedVars': changed_paths,
                },
            }
            __post_step__(json.dumps(snapshot))
        except Exception:
            pass
    return _trace

def _peek_heap_local():
    return {}

# ─── execution kickoff ────────────────────────────────────────────────────

_user_globals = {
    '__name__': '__main__',
    '__doc__': None,
    '__builtins__': __builtins__,
}

sys.settrace(_trace)
try:
    exec(compile(__user_code__, '<string>', 'exec'), _user_globals)
except SystemExit:
    pass
except Exception as _exc:
    _tb = _exc.__traceback__
    _lineno = None
    while _tb is not None:
        if _tb.tb_frame.f_code.co_filename == '<string>':
            _lineno = _tb.tb_lineno
        _tb = _tb.tb_next
    __post_step__(json.dumps({
        'type': 'ERROR',
        'message': type(_exc).__name__ + ': ' + str(_exc),
        'line': _lineno,
    }))
finally:
    sys.settrace(None)
`;
