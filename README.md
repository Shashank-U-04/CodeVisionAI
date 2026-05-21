# CodeVision AI

**See your code think.** An interactive multi-language execution visualizer that lets you step through code line by line and watch variables, stack frames, and heap objects come alive in real time.

## Features

- **Step-by-step execution** — step forward/backward through every line of your program
- **Four languages, one UI** — Python (in-browser via [Pyodide](https://pyodide.org)) plus C, C++, and Java (server-traced via GCC/GDB and the Java Debug Interface)
- **Live stack visualization** — call stack with frame cards, highlighted active frame, variable flash on change
- **Live heap visualization** — lists, dicts, sets, tuples, arrays, class instances rendered as compact content-sized boxes with SVG reference arrows
- **Syntax-highlighted editor** — Monaco editor with per-language highlighting and a current-line gutter arrow
- **Interactive console** — full `input()` / `scanf` / `cin` / `Scanner` support, including programs that prompt mid-run
- **Light & dark mode** — toggle anytime, persisted across the session
- **No signup, no install** — Python runs entirely in the browser; the other languages stream via a single SSE endpoint

## Project Structure

```
CodeVisionAI/
├── apps/
│   ├── web/          # Next.js 16 frontend (main app)
│   └── api/          # FastAPI backend powering C/C++/Java tracing over SSE
├── packages/
│   ├── visualizer-engine/   # Engine abstraction: Pyodide (in-browser) + remote SSE adapter
│   ├── ui/                  # Shared UI components
│   ├── database/            # DB utilities
│   └── config/              # Shared config
├── docs/
│   └── multi-language-visualization-plan.md   # 8-phase architecture plan
└── turbo.json
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, features, how it works, testimonials |
| `/app` | The visualizer — language picker, editor, stack panel, heap panel |
| `/learn`, `/learn/[slug]` | Tutorials |
| `/docs`, `/docs/[slug]` | Reference docs |
| `/about`, `/changelog` | Marketing pages |

## Multi-language backend

The API at `apps/api` exposes a single SSE endpoint that streams the same `EngineEvent` shape the in-browser Python tracer emits, so the frontend stays language-agnostic.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/execute/stream` | Start a run, return SSE `EngineEvent` stream |
| `POST` | `/api/v1/execute/input/{session_id}` | Deliver a value in response to an `INPUT_REQUEST` |
| `POST` | `/api/v1/execute/cancel/{session_id}` | Cancel an in-flight session |
| `GET` | `/api/v1/health/` | Liveness |

Per-language tracer strategy:

| Language | Strategy |
|---|---|
| **Python** | Pyodide WebAssembly in a Web Worker — never hits the API |
| **C / C++** | `gcc`/`g++ -g3 -O0` + `gdb --interpreter=mi2` driven by [pygdbmi](https://pypi.org/project/pygdbmi/). Stdout is captured via a `freopen` prologue; stdin uses `dup2` on fd 0 with a constructor priority of 101 so it runs before libstdc++'s `ios_base::Init` |
| **Java** | JDI over JDWP launched via a `MainLauncher` bootstrap that installs a `CvaiInputStream` wrapping `System.in`. Step events are filtered to the user's main class |

Interactive input flow: when a program calls `Scanner.nextInt()` (or `scanf`, etc.) with nothing left in the pre-supplied buffer, the tracer emits `INPUT_REQUEST` over SSE; the frontend POSTs the user's value to `/execute/input/{sid}`, the session bus unblocks the tracer, and execution continues.

## Getting Started

### Prerequisites

- Node.js 18+, npm 9+
- For the C/C++/Java backend: Python 3.11+, JDK 11+, and `gcc`/`g++`/`gdb` on PATH (MinGW on Windows works fine)

### Install & run — frontend (Python in-browser)

```bash
npm install
npm run dev --workspace=web
```

Then open <http://localhost:3000>. Python visualization works without the backend.

### Install & run — backend (for C, C++, Java)

```bash
cd apps/api
pip install -r requirements.txt pygdbmi
python -m uvicorn app.main:app --port 8000
```

Set `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` in `apps/web/.env.local` so the remote engine knows where to find the API. `CVAI_ALLOWED_ORIGINS` on the API side controls CORS.

Headless smoke tests live in `apps/api/smoke_*.py` (one per language path, plus an HTTP-level interactive INPUT_REQUEST round-trip).

### Build

```bash
npm run build
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Editor | Monaco Editor |
| Python runtime | Pyodide (WASM) |
| Terminal | xterm.js |
| State | Zustand |
| Backend | FastAPI + SSE (`sse-starlette`) |
| C / C++ tracing | GCC / G++ + GDB MI via `pygdbmi` |
| Java tracing | OpenJDK Java Debug Interface (JDI) |
| Fonts | Space Grotesk (headings), Geist Mono (code) |
| Monorepo | Turborepo |

## Development Notes

- The visualizer engine lives in `packages/visualizer-engine`. `createEngine({ language })` returns either the in-browser Pyodide engine or `RemoteEngine` (fetch + SSE) depending on the language; the workspace UI is language-agnostic.
- Pydantic models in `apps/api/app/schemas/execution.py` mirror `packages/visualizer-engine/src/types.ts` exactly, so the wire format is identical regardless of tracer.
- The Java tracer compiles three classes once into `apps/api/app/tracers/java/.build/`: `JdiTracer` (the JDI driver), `MainLauncher` (bootstrap), and `CvaiInputStream` (the stdin shim that fires `INPUT_REQUEST`).
- CSS design tokens are defined in `apps/web/src/app/globals.css`. Light mode is the default; dark mode activates via `data-theme="dark"` on `<html>`.
- The heap panel renders boxes sized to content (no fixed widths) — heap object containers use `inline-flex` so they shrink-wrap their content.

## License

MIT
