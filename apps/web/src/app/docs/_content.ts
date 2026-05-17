/**
 * Docs content registry.
 * Each doc has a real, written body — these are NOT placeholders.
 * Bodies are stored as ordered blocks so the page can render headings,
 * paragraphs, code, lists, and key/value tables consistently.
 */

export type DocBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'code'; code: string; language?: 'python' | 'text' }
  | { type: 'kv'; rows: Array<{ key: string; value: string }> }
  | { type: 'callout'; text: string; tone?: 'info' | 'warning' };

export interface DocPage {
  slug: string;
  title: string;
  summary: string;
  group: 'Start here' | 'Reference' | 'Architecture' | 'Help';
  blocks: DocBlock[];
}

const GETTING_STARTED: DocBlock[] = [
  { type: 'p', text: 'CodeVision AI runs entirely in your browser — there is nothing to install, no account, and no code ever leaves your machine. This guide walks you through your first visualization in under two minutes.' },
  { type: 'h2', text: '1. Open the visualizer' },
  { type: 'p', text: 'Click "Open Visualizer" in the top nav. The first time you open it, Pyodide (the Python runtime that runs inside your browser) downloads roughly 6 MB of WebAssembly. This takes 5–15 seconds on a typical connection. You will see a loading overlay until it finishes — after that, the runtime stays cached and subsequent loads are instant.' },
  { type: 'h2', text: '2. Pick a language' },
  { type: 'p', text: 'The first screen asks you to pick a language. Python is currently the only language with full step-by-step visualization — C, C++, and Java have working editors but the visualizer engine for them is still in development. You can change the language at any time from the top-left badge in the workspace.' },
  { type: 'h2', text: '3. Write or paste code' },
  { type: 'p', text: 'The left panel is a full Monaco editor (the same engine that powers VS Code). Edit the example, paste your own code, or use the "Try an example" dropdown in the editor header to load a starter. Keep programs short — the visualizer captures every line of execution, so a 10,000-step program will produce 10,000 frames to step through.' },
  { type: 'h2', text: '4. Run and step through' },
  { type: 'p', text: 'Press Run. The engine executes your code in a sandboxed Pyodide worker and records a trace of every line. When execution finishes, click "Start visualization" and use the arrow keys (or the controls in the header) to step forward and backward.' },
  { type: 'callout', tone: 'info', text: 'The visualization is fully scrubbable — you can jump to any point in the timeline using the slider at the bottom. State is reconstructed deterministically, so there is no way to corrupt a session.' },
];

const SUPPORTED_LANGUAGES: DocBlock[] = [
  { type: 'p', text: 'CodeVision is multi-language by design, but the visualization engine is built one language at a time. Here is what works today and what is coming.' },
  { type: 'h2', text: 'Python — full support' },
  { type: 'p', text: 'Python 3.12 runs in-browser via Pyodide. The visualizer captures local variables, the call stack, return values, all heap objects (lists, dicts, sets, tuples, instances, classes, functions), and reference relationships. interactive input() works via an xterm.js console.' },
  { type: 'list', items: [
    'Step forward and backward freely — execution is deterministic and fully replayable.',
    'Heap objects show their identity, type, and contents, with arrows linking references.',
    'Mutations are highlighted with a brief flash so changes are obvious.',
    'No size limits enforced on your side, but very long traces will use more memory.',
  ]},
  { type: 'h2', text: 'C, C++, Java — editor only' },
  { type: 'p', text: 'You can write and explore code in these languages with proper syntax highlighting in the Monaco editor, but the visualization engine is not wired up yet. We are building these incrementally; C is targeted next because explicit pointer semantics make a great visual story.' },
  { type: 'h2', text: 'Roadmap' },
  { type: 'kv', rows: [
    { key: 'Python', value: 'Released' },
    { key: 'C', value: 'In progress — Q3' },
    { key: 'C++', value: 'Planned — after C' },
    { key: 'Java', value: 'Planned — after C++' },
    { key: 'JavaScript', value: 'Under consideration' },
  ]},
];

const KEYBOARD_SHORTCUTS: DocBlock[] = [
  { type: 'p', text: 'CodeVision is built to be navigated from the keyboard. These shortcuts work anywhere on the /app page except inside the Monaco editor (which uses its own VS Code-compatible bindings).' },
  { type: 'h2', text: 'Stepping' },
  { type: 'kv', rows: [
    { key: '→ / ↓', value: 'Step forward one execution event' },
    { key: '← / ↑', value: 'Step backward one execution event' },
    { key: 'Home', value: 'Jump to the first step' },
    { key: 'End', value: 'Jump to the last step' },
  ]},
  { type: 'h2', text: 'Running' },
  { type: 'kv', rows: [
    { key: 'Ctrl + Enter', value: 'Run the current code' },
    { key: 'Esc', value: 'Stop a running program' },
    { key: '?', value: 'Open the keyboard shortcuts popover' },
  ]},
  { type: 'h2', text: 'Inside the editor' },
  { type: 'p', text: 'The Monaco editor supports all standard VS Code bindings: Ctrl+/ to toggle a comment, Ctrl+D to add a cursor to the next match, Alt+↑/↓ to move a line, Ctrl+F to find and replace. The editor goes read-only while a program is running.' },
];

const ENGINE_ARCHITECTURE: DocBlock[] = [
  { type: 'p', text: 'Under the hood, CodeVision is three pieces glued together: a Pyodide worker that runs your code, a tracer that records every line of execution into a normalized state format, and a React renderer that draws frames, heap objects, and arrows.' },
  { type: 'h2', text: 'The pipeline' },
  { type: 'list', ordered: true, items: [
    'You click Run. The web app posts your source code to a Web Worker.',
    'The worker initializes Pyodide (cached after first load) and installs a settrace hook.',
    'Each line of your program triggers a snapshot: the call stack is walked, locals are serialized, and reachable heap objects are captured.',
    'Snapshots stream back to the main thread as ExecutionState objects and accumulate in a Zustand store.',
    'When execution ends, the renderer reads the current step from the store and lays out frames, objects, and reference arrows.',
  ]},
  { type: 'h2', text: 'Why a worker' },
  { type: 'p', text: 'A long-running program would otherwise block the main thread and freeze the UI. Running Python in a worker keeps the editor, controls, and timeline fully responsive — you can stop a runaway loop at any time without reloading the page.' },
  { type: 'h2', text: 'Determinism' },
  { type: 'p', text: 'Because we record states (not events), going backward is free — the renderer just reads an earlier snapshot. There is no "undo" logic to maintain, no replay engine to debug. Bugs in the tracer become visual bugs you can see, not invisible state-machine bugs.' },
  { type: 'callout', tone: 'info', text: 'The visualizer-engine package is its own workspace under packages/visualizer-engine. It exports types, the tracer, and adapters for future languages. Pull requests welcome.' },
];

const FAQ: DocBlock[] = [
  { type: 'h2', text: 'Is my code uploaded anywhere?' },
  { type: 'p', text: 'No. Everything — including the Python runtime — runs in your browser. There is no backend execution and no telemetry on the code you write. Closing the tab discards everything.' },
  { type: 'h2', text: 'Why is the first load slow?' },
  { type: 'p', text: 'Pyodide is a full Python implementation compiled to WebAssembly. It is roughly 6 MB and decompresses to about 25 MB. After the first load it stays in your browser cache, so subsequent visits are near-instant.' },
  { type: 'h2', text: 'How does this compare to Python Tutor?' },
  { type: 'p', text: 'Python Tutor is the project that pioneered visual execution and inspired this one. The two big differences: CodeVision runs everything client-side (no server round-trip per step), and the renderer is built for modern screens — dark mode, responsive layout, animated transitions, scrubbable timeline.' },
  { type: 'h2', text: 'Can I use this for teaching?' },
  { type: 'p', text: 'Yes — that is exactly the audience. It is free, requires no signup, and works on any modern browser including iPads. If you teach CS and want a feature added, please open an issue.' },
  { type: 'h2', text: 'What is the largest program I can visualize?' },
  { type: 'p', text: 'Programs that complete in a few seconds and generate a few thousand steps work great. Beyond ~10,000 steps the trace gets unwieldy — not because of technical limits, but because no human can step through that many states meaningfully. Trim to a representative example.' },
];

export const DOCS: DocPage[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    summary: 'From zero to your first visualization in under two minutes.',
    group: 'Start here',
    blocks: GETTING_STARTED,
  },
  {
    slug: 'supported-languages',
    title: 'Supported Languages',
    summary: 'What works today, what is in progress, and what is on the roadmap.',
    group: 'Reference',
    blocks: SUPPORTED_LANGUAGES,
  },
  {
    slug: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    summary: 'Step, run, and navigate without touching the mouse.',
    group: 'Reference',
    blocks: KEYBOARD_SHORTCUTS,
  },
  {
    slug: 'engine-architecture',
    title: 'Engine Architecture',
    summary: 'How Pyodide, the tracer, and the renderer fit together.',
    group: 'Architecture',
    blocks: ENGINE_ARCHITECTURE,
  },
  {
    slug: 'faq',
    title: 'FAQ',
    summary: 'Privacy, performance, comparison to other tools, classroom use.',
    group: 'Help',
    blocks: FAQ,
  },
];

export function getDoc(slug: string): DocPage | undefined {
  return DOCS.find((d) => d.slug === slug);
}

export const DOC_GROUPS: Array<DocPage['group']> = ['Start here', 'Reference', 'Architecture', 'Help'];
