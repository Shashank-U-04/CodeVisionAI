# Multi-Language Visualization Backend — Architecture Plan

**Project:** CodeVisionAI
**Scope:** C, C++, Java tracing backend; Python remains in-browser
**Target runtime:** Linux containers (dev on Windows via Docker Desktop / WSL2)
**Frontend contract owner:** `packages/visualizer-engine/src/types.ts` (do not break)

---

## Executive Summary

CodeVisionAI needs a backend that traces C/C++/Java execution into the same `ExecutionState` shape Pyodide already produces, so the frontend stays language-agnostic. The recommended design is a FastAPI service exposing a single SSE endpoint `POST /api/v1/execute/stream` that emits the existing `EngineEvent` discriminated union, plus a sibling `POST /api/v1/execute/input/{session_id}` to satisfy `INPUT_REQUEST` round-trips (replacing the browser's SharedArrayBuffer with Redis pub/sub server-side).

For C/C++, use **GCC -g3 -O0** compiled inside a per-execution Docker container, driven by **GDB/MI** with Python pretty-printers; this gives line stepping, locals, malloc tracking via a `__wrap_malloc` shim, and STL via libstdc++ printers. For Java, use **JDI over JDWP** against an OpenJDK JVM launched with `-agentlib:jdwp`; JDI exposes frames, locals, object refs, and arrays without bytecode rewriting.

Each run executes in a one-shot **gVisor-backed Docker container** with no network, 256 MB RAM, 5 s CPU, 100 PID cap, read-only rootfs. The existing `PrimitiveValue | RefValue | HeapObject` model extends cleanly with three new heap types (`array`, `pointer`, `cstring`) and a `pointee` field on primitives. Cap at 2,000 steps to match Python.

The plan below is structured as 8 build phases, each delivering a runnable slice.

---

## 1. FastAPI Surface

### 1.1 Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/health/` | Liveness (exists) |
| `POST` | `/api/v1/execute/stream` | Start run, return SSE stream of `EngineEvent` |
| `POST` | `/api/v1/execute/input/{session_id}` | Deliver user input for an `INPUT_REQUEST` |
| `POST` | `/api/v1/execute/cancel/{session_id}` | Kill an in-flight session |

### 1.2 Request shape (`POST /execute/stream`)

```json
{
  "language": "c" | "cpp" | "java",
  "code": "string",
  "stdin": "string (optional, pre-supplied)",
  "options": { "step_budget": 2000, "timeout_ms": 5000 }
}
```

### 1.3 Response — Server-Sent Events

Why SSE over WebSocket: unidirectional event stream, plays well with FastAPI's `StreamingResponse`, no extra protocol upgrade, trivial to reconnect, native EventSource on the frontend. Bidirectional input handled out-of-band by a second HTTP POST — keeps the stream truly one-way and simpler to reason about.

Event format (one event = one `EngineEvent`, serialized identically to the Pyodide worker):

```
event: message
data: {"type":"READY"}

event: message
data: {"type":"STEP","state":{...ExecutionState...}}

event: message
data: {"type":"INPUT_REQUEST","prompt":">> ","sessionId":"abc"}

event: message
data: {"type":"OUTPUT","value":"hello\n"}

event: message
data: {"type":"DONE"}
```

Note: `INPUT_REQUEST` gains a `sessionId` field server-side; the frontend adapter strips it before passing to the existing engine event consumer. Alternative: keep types identical and carry `sessionId` in an SSE comment line (`:sid=abc`) — cleaner but harder to parse.

### 1.4 INPUT_REQUEST handshake

1. Backend emits `INPUT_REQUEST` event, then **the tracer subprocess blocks** waiting on a Redis BLPOP keyed by `input:{session_id}` (or an `asyncio.Event` if single-instance).
2. Frontend `POST`s to `/execute/input/{session_id}` with `{ "value": "..." }`.
3. Endpoint LPUSHes the value; tracer unblocks, feeds stdin to the debuggee, continues stepping.
4. Timeout for input wait: 60 s; after that the session is killed with an `ERROR` event.

Why Redis: also serves as the session registry, allows API replicas to coordinate (POST may land on a different pod than the SSE stream). For MVP, a single-process `dict[str, asyncio.Queue]` is sufficient — abstract via a `SessionBus` protocol so Redis is a drop-in later.

### 1.5 Frontend adapter

New file: `packages/visualizer-engine/src/remote-engine.ts` implementing the same shape as `VisualizerEngine` (`initialize/run/provideInput/dispose/onEvent`), but using `EventSource` + `fetch`. Selected by a `language` parameter passed in from `apps/web/src/app/app/page.tsx`. The visualization UI doesn't change.

---

## 2. C/C++ Tracing Strategy

### 2.1 Recommendation: GCC + GDB MI

**Why GDB/MI over alternatives:**

| Option | Verdict |
|---|---|
| **GDB/MI** | Recommended. MI is a machine-readable protocol designed for IDE integration. Supports stepping, locals, stack, arbitrary expressions, Python pretty-printers for STL. Mature, free. |
| LLDB | Comparable but MI implementation is less complete; Python API is excellent on macOS but spotty on Linux containers. |
| Valgrind | Heap tracking only, not a stepper. Use as a complement, not a replacement. |
| RR / time-travel | Overkill for line-by-line vis. |
| Custom Clang AST instrumentation | Massive scope; rebuild everything. Park this as a v2 option. |

### 2.2 Compile flags

```bash
gcc   -g3 -O0 -std=c17   -fno-omit-frame-pointer \
      -Wl,--wrap=malloc -Wl,--wrap=free -Wl,--wrap=calloc -Wl,--wrap=realloc \
      -o /tmp/prog user.c heap_shim.c
g++   -g3 -O0 -std=c++20 -fno-omit-frame-pointer \
      -o /tmp/prog user.cpp
```

`heap_shim.c` is a tiny C file that wraps malloc/free, records `{addr, size, file:line}` in a global table, exposes a `__cvai_heap_dump()` symbol GDB calls each step.

### 2.3 Driver — pygdbmi

`pygdbmi` (PyPI) gives a Python `GdbController` with sync/async response parsing. Command sequence per step:

```
-file-exec-and-symbols /tmp/prog
-gdb-set print pretty on
-enable-pretty-printer            # picks up libstdc++ printers automatically
-break-insert main
-exec-run
loop:
  -stack-list-frames
  -stack-list-locals --simple-values
  -stack-list-variables --skip-unavailable --all-values
  -data-evaluate-expression __cvai_heap_dump()   # custom heap table
  -exec-next                                     # line step (use -exec-step to descend into calls)
```

STL containers (`std::vector`, `std::map`, `std::string`) become readable via libstdc++ pretty-printers shipped in `/usr/share/gcc-*/python/libstdcxx/` — load with `python import sys; sys.path.insert(0, '/usr/share/gcc-13/python')` in a `.gdbinit`.

### 2.4 Mapping to ExecutionState

- `-stack-list-frames` -> `frames[]`
- `-stack-list-variables` per frame -> `locals` (parse type from `-var-info-type` to decide primitive vs ref)
- `__cvai_heap_dump()` returns JSON `[{addr, size, type}]` -> `heap` entries keyed by `addr` (use addr as `id`)
- Pointers become `RefValue { id: addr }`; dereferenced struct contents fetched lazily via `-data-evaluate-expression *(StructName*)0xADDR`

### 2.5 Stdin/stdout

GDB inferior tty redirected: launch with `-tty=/dev/pts/X` created by `pty.openpty()`. The Python driver reads/writes that fd, emitting `OUTPUT` events and answering `INPUT_REQUEST` via the session bus.

---

## 3. Java Tracing Strategy

### 3.1 Recommendation: JDI over JDWP

**Why JDI (Java Debug Interface):**

| Option | Verdict |
|---|---|
| **JDI via JDWP** | Recommended. Built into every JDK. No user-code rewriting. Exposes `StackFrame.visibleVariables()`, `ObjectReference.getValues()`, full breakpoint and step API. |
| ASM/Javassist bytecode instrumentation | Powerful but invasive — must compile, then rewrite, then run. Hard to map back to source lines reliably. |
| JVMTI native agent | Lower-level than JDI; same data, more C code to maintain. |
| Java Flight Recorder | Sampling, not stepping. |

JDI client must run on the JVM (Java) — easiest is a tiny **`tracer/JdiTracer.java`** that wraps JDI and emits NDJSON to stdout, then the Python FastAPI process spawns it as a subprocess and re-emits events as SSE.

### 3.2 Compile + launch

```bash
javac -g -d /tmp/cls /tmp/User.java
java  -cp /tmp/cls:/opt/cvai/tracer.jar \
      -agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=127.0.0.1:0 \
      com.codevisionai.tracer.JdiTracer User
```

`JdiTracer` attaches via `AttachingConnector`, sets a `MethodEntryRequest` + `StepRequest(STEP_LINE, STEP_INTO)`, on each event walks `ThreadReference.frames()`, serializes locals + reachable objects, prints one JSON line, then `vm.resume()`.

### 3.3 Object graph extraction

- Primitives -> `PrimitiveValue`
- `ObjectReference.uniqueID()` -> `RefValue.id` and `HeapObject.id`
- `ArrayReference` -> new `ArrayObject` heap type
- `StringReference` -> primitive `str` (matches Python visualization)
- Plain objects -> `InstanceObject { className, attrs }`, using `referenceType().allFields()` + `getValues()`
- Limit recursion depth (3) and per-collection size (50, same as Python tracer)

### 3.4 Generics

Type erasure means JDI sees raw types; `referenceType().genericSignature()` gives the source-level signature. Parse this into a `className` string like `ArrayList<Integer>` for display only.

---

## 4. Sandbox / Security

### 4.1 Recommendation: Docker + gVisor, one container per execution

Layered defense:

| Layer | Control |
|---|---|
| **Container runtime** | `--runtime=runsc` (gVisor) — syscall filtering kernel in userspace, defeats most kernel exploits |
| **Image** | `cvai/runner:latest` based on `gcc:13-slim` + `openjdk:21-slim`, non-root user `runner:runner` (uid 10001) |
| **Filesystem** | `--read-only`, `--tmpfs /tmp:size=64m,exec`, no volume mounts except `/work` (tmpfs, the code dir) |
| **Network** | `--network=none` |
| **Memory** | `--memory=256m --memory-swap=256m` |
| **CPU** | `--cpus=1.0` plus wall clock kill at 5 s from the API |
| **PIDs** | `--pids-limit=64` |
| **Capabilities** | `--cap-drop=ALL --security-opt=no-new-privileges` |
| **Seccomp** | Default Docker profile + gVisor on top |
| **ulimits** | `--ulimit nofile=64:64 --ulimit fsize=1048576` (1 MB max file write) |

Alternatives considered:
- **firejail** — desktop tool, less production-tested in server contexts; reject.
- **nsjail** — solid, used by Google; viable but more setup than Docker. Keep as fallback if gVisor proves too slow.
- **Bare Linux namespaces** — DIY, lots of failure modes; reject.
- **WASM (Wasmer/Wasmtime)** — attractive long-term for C/C++ via Emscripten, but loses ptrace/JDWP capability needed for stepping; reject for now.

### 4.2 Container lifecycle

1. API receives request, generates `session_id`, writes code to a host tmpdir.
2. `docker run --rm -d --name cvai-{sid} ... cvai/runner /opt/cvai/entrypoint.sh`.
3. Entrypoint dispatches on language and runs gdb/jdi driver, which streams NDJSON to stdout.
4. API tails container logs (`aiodocker.events`), parses each line, re-emits as SSE.
5. Wall-clock watchdog `asyncio.wait_for` kills via `docker kill` on timeout.

### 4.3 Pool / cold start

Cold container start ~300 ms is acceptable for MVP. If profiling demands, pre-warm a pool of paused containers — but YAGNI for now.

---

## 5. State Mapping

### 5.1 Existing model recap

`PrimitiveValue | RefValue` on the stack; `ListObject | TupleObject | DictObject | SetObject | FunctionObject | ClassObject | InstanceObject` on the heap. All references keyed by integer `id`.

### 5.2 Mapping table

| Language concept | Maps to |
|---|---|
| C `int`, `float`, `double`, `char` | `PrimitiveValue` (`int` / `float`) |
| C `char*` / string literal | `PrimitiveValue { type: 'str' }` (deref'd) **and** a sibling `RefValue` if visualizing the pointer itself |
| C pointer `T*` | `RefValue { id: addr }` -> new `PointerObject { type: 'pointer', pointee: StackValue, addr }` |
| C `struct` (stack) | `InstanceObject` with `className = "struct Foo"` |
| C array `T[N]` | new `ArrayObject { type: 'array', elemType, elements }` |
| C++ `std::vector<T>` | `ArrayObject` (via pretty-printer) |
| C++ `std::map<K,V>` | `DictObject` (reuse existing) |
| C++ class instance | `InstanceObject` (reuse) |
| C++ reference `T&` | Same as pointer; flag with `isReference: true` |
| Java primitive | `PrimitiveValue` |
| Java `String` | `PrimitiveValue { type: 'str' }` |
| Java array | `ArrayObject` |
| Java `ArrayList` | `ListObject` (reuse) |
| Java `HashMap` | `DictObject` |
| Java object | `InstanceObject` |
| Java `null` | `PrimitiveValue { type: 'None' }` |

### 5.3 Required type additions

Minimal — add to `packages/visualizer-engine/src/types.ts`:

```ts
export interface ArrayObject {
  type: 'array';
  id: number;
  elemType: string;          // "int", "Foo*", "java.lang.String"
  elements: StackValue[];
}

export interface PointerObject {
  type: 'pointer';
  id: number;                // pointer's own storage address
  addr: number;              // the address it points to (also the pointee's heap id)
  pointee: StackValue;       // usually a RefValue
  isReference?: boolean;     // C++ ref vs raw pointer
}

// Extend the union
export type HeapObject = /* existing */ | ArrayObject | PointerObject;

// Extend primitive types
export type PrimitiveType = 'int' | 'float' | 'str' | 'bool' | 'None'
  | 'char' | 'long' | 'double';  // optional precision tags; UI may collapse to int/float
```

`StackFrame` also gains optional `returnType?: string` for typed languages — purely cosmetic.

### 5.4 Gaps explicitly *not* filled

- Function pointers / lambdas: serialize as `FunctionObject` with `name` only.
- Templates / generics: name string only, no parameter visualization.
- Memory layout, padding, bit fields: out of scope.

---

## 6. Step Budget

Keep the **2,000 step cap**, same as Python. Reasoning:
- UI scrubber and timeline are tuned for ~2k snapshots
- Each step from GDB is ~5–20 ms; 2k * 20 ms = 40 s worst case, well under the 5 s hard timeout we'd hit first for actual user code
- Compiled languages may emit more steps per "perceived" action (e.g., destructor calls); make the limit *configurable* via `options.step_budget` but default to 2000
- Emit `ERROR { message: "Step budget exceeded" }` and `DONE` on overflow, exactly like the Python tracer

Per-step payload size cap: 256 KB JSON; truncate `heap` with a sentinel `{ type: 'truncated' }` entry if exceeded.

---

## 7. Implementation Phase Plan

Each phase is mergeable and demonstrably testable. Paths are under `apps/api/app/` unless noted.

### Phase 1 — Foundations & contracts (no execution yet)
- `schemas/execution.py` — Pydantic models mirroring `ExecutionState`, `EngineEvent`. Use `@dataclass(frozen=True)` style via Pydantic `model_config = ConfigDict(frozen=True)`.
- `schemas/requests.py` — `ExecuteRequest`, `InputRequest`.
- `core/session_bus.py` — `SessionBus` Protocol + `InMemorySessionBus` implementation.
- `routes/execute.py` (rewrite) — SSE skeleton that emits a hardcoded `READY -> STEP(mock) -> DONE` for `language="mock"`.
- `tests/test_sse_contract.py` — pytest + httpx async client validates event ordering and JSON shape.

**Deliverable:** Frontend `remote-engine.ts` can render mock events end-to-end.

### Phase 2 — Frontend remote adapter
- `packages/visualizer-engine/src/remote-engine.ts` — `EventSource` + `fetch`, same surface as `VisualizerEngine`.
- `packages/visualizer-engine/src/index.ts` — export `createEngine(language)` factory.
- `apps/web/src/app/app/page.tsx` — switch on language store.

**Deliverable:** Selecting "C" in the UI streams mock events from FastAPI.

### Phase 3 — Sandbox infrastructure
- `infra/docker/runner.Dockerfile` — gcc-13, openjdk-21, python3, gdb, pygdbmi, non-root user, entrypoint script.
- `infra/docker/entrypoint.sh` — dispatches on `$CVAI_LANG`, reads `/work/code.*`, execs the right driver.
- `core/sandbox.py` — `class Sandbox` wrapping `aiodocker`: `run(language, code) -> AsyncIterator[bytes]` with all limits applied.
- `tests/test_sandbox.py` — spawns container running `echo hi`, asserts cleanup, asserts memory-bomb is killed.

**Deliverable:** API can launch and reap one-shot containers.

### Phase 4 — C tracer (driver runs *inside* the container)
- `tracers/c/heap_shim.c` — malloc wrappers.
- `tracers/c/driver.py` — pygdbmi loop, emits NDJSON, calls `heap_shim` table.
- `tracers/c/serialize.py` — GDB `-var-list-children` -> `ExecutionState`.
- `routes/execute.py` — `language="c"` path wires Sandbox -> SSE.
- `tests/test_c_tracer.py` — fixtures with `hello.c`, `fib.c`, `linked_list.c`; assert step count, final stdout, presence of heap entries.

**Deliverable:** Run real C in the visualizer.

### Phase 5 — C++ extension
- Reuse Phase 4 driver; add `-enable-pretty-printer` and STL serializer fast paths in `serialize.py`.
- `tracers/cpp/` mostly empty; just compile flag differences.
- `tests/test_cpp_tracer.py` — vector, map, class with method.

**Deliverable:** C++ works including STL display.

### Phase 6 — Java tracer
- `tracers/java/JdiTracer.java` + `pom.xml` (or simple `javac` build into `tracer.jar`, bundled into the Docker image).
- `tracers/java/driver.py` — spawns `java -agentlib:jdwp...`, attaches JdiTracer, relays NDJSON.
- `tests/test_java_tracer.py` — Hello, recursion, ArrayList, HashMap, custom class.

**Deliverable:** Java works.

### Phase 7 — INPUT_REQUEST end-to-end
- `routes/execute.py` — implement `/input/{session_id}`.
- Wire pty-based stdin into C/C++ driver; wire `System.in` redirect into Java driver.
- `tests/test_input_handshake.py` — code that reads two ints, supplies them mid-stream, asserts final state.

**Deliverable:** Interactive programs work for all three languages.

### Phase 8 — Hardening & ops
- `core/limits.py` — step budget, payload size truncation, wall clock.
- `core/metrics.py` — Prometheus counters (executions by language, timeouts, errors).
- `core/logging.py` — structured logs, redact user code at WARNING+.
- Add `bandit` to CI; pin all deps; verify `--cap-drop=ALL` end-to-end with a privilege-escalation test fixture.
- `docs/RUNBOOK.md` — how to deploy, rotate the runner image, investigate a stuck session.

**Deliverable:** Production-ready.

---

## 8. Open Questions / Risks

1. **gVisor on Windows dev hosts** — Docker Desktop's WSL2 backend doesn't expose `runsc`. Dev environment will fall back to plain Docker; only prod gets gVisor. Document this clearly.
2. **JDWP attach race** — JVM may print "Listening for transport" before the socket actually accepts; need a retry loop in `JdiTracer`, not a flat sleep.
3. **GDB pretty-printer paths** drift between GCC versions; pin the runner image's gcc to a specific minor and verify printer load on container build.
4. **Step explosion from C++ destructors** — RAII can multiply step count 3–5×. May need a "skip implicit steps" filter that collapses compiler-generated lines (heuristic: same source line as previous step + no observable state change).
5. **Multi-file projects** — out of scope for MVP; document that only single-file source is accepted.
6. **Cost of one container per run** — at scale, container-pool warming or Firecracker microVMs become attractive. Defer until p95 cold start hurts.
7. **Cross-language test harness** — need a shared "golden trace" fixture format so the same program (Fibonacci, linked list) produces structurally similar visualizations in Python, C, Java; otherwise the UX feels inconsistent.
8. **SharedArrayBuffer parity** — the Python in-browser engine uses SAB for synchronous `input()`; the remote engine uses async HTTP. UI must tolerate the latency difference (show "waiting for input" indicator).
