# CodeVision AI

**See your code think.** An interactive Python execution visualizer that lets you step through code line by line and watch variables, stack frames, and heap objects come alive in real time — entirely in the browser.

## Features

- **Step-by-step execution** — run Python in the browser via [Pyodide](https://pyodide.org), then step forward/backward through every line
- **Live stack visualization** — call stack with frame cards, highlighted active frame, variable flash on change
- **Live heap visualization** — lists, dicts, sets, tuples, class instances rendered as compact content-sized boxes with SVG reference arrows
- **Syntax-highlighted editor** — Monaco editor with Python highlighting and current-line gutter arrow
- **Interactive console** — full `input()` / `print()` support via xterm.js
- **Light & dark mode** — toggle anytime, persisted across the session
- **100% in-browser** — no server, no install, no signup

## Project Structure

```
OnlinePythonTutor/
├── apps/
│   ├── web/          # Next.js 16 frontend (main app)
│   └── api/          # Python FastAPI backend (optional, unused in browser mode)
├── packages/
│   ├── visualizer-engine/   # Pyodide execution engine + tracer
│   ├── ui/                  # Shared UI components
│   ├── database/            # DB utilities
│   └── config/              # Shared config
└── turbo.json
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, features, how it works, testimonials |
| `/app` | The visualizer — editor, stack panel, heap panel |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & run

```bash
# Install all workspace dependencies
npm install

# Start the web app (Next.js on http://localhost:3000)
cd apps/web && npm run dev
```

Or from the repo root using Turborepo:

```bash
npm run dev
```

> The Python API (`apps/api`) requires `uvicorn` and is not needed for the browser-only visualizer.

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
| Fonts | Space Grotesk (headings), Geist Mono (code) |
| Monorepo | Turborepo |

## Development Notes

- The visualizer engine lives in `packages/visualizer-engine` — it runs Python inside a Web Worker via Pyodide and streams execution steps back to the UI.
- CSS design tokens are defined in `apps/web/src/app/globals.css`. Light mode is the default; dark mode activates via `data-theme="dark"` on `<html>`.
- The heap panel renders boxes sized to content (no fixed widths) — heap object containers use `inline-flex` so they shrink-wrap their content.

## License

MIT
