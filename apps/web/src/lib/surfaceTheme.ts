/**
 * Theme bridge for the two canvas-rendered surfaces (Monaco, xterm.js).
 *
 * Neither widget can consume CSS custom properties: Monaco needs literal hex
 * in `defineTheme`, and xterm paints to a canvas. So both read the resolved
 * `--cv-*` token values at runtime and rebuild whenever the theme flips.
 * globals.css stays the single source of truth for color.
 */

export type SurfaceMode = 'light' | 'dark';

const FALLBACKS: Record<string, string> = {
  '--cv-editor-bg': '#ffffff',
  '--cv-editor-fg': '#18181b',
  '--cv-editor-gutter-fg': '#9ca3af',
  '--cv-editor-selection': '#bfdbfe',
  '--cv-console-bg': '#ffffff',
  '--cv-console-fg': '#18181b',
  '--cv-console-cursor': '#2563eb',
  '--cv-console-sel': '#bfdbfe',
  '--cv-line-highlight': '#f3f4f6',
  '--cv-border': '#e4e4e7',
  '--cv-syn-keyword': '#7c3aed',
  '--cv-syn-string': '#059669',
  '--cv-syn-number': '#2563eb',
  '--cv-syn-comment': '#9ca3af',
  '--cv-syn-builtin': '#d97706',
  '--cv-syn-decorator': '#db2777',
  '--cv-syn-operator': '#6b7280',
  '--cv-syn-class': '#0891b2',
  '--cv-syn-function': '#2563eb',
};

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function byteToHex(n: number): string {
  return clampByte(n).toString(16).padStart(2, '0');
}

/**
 * Normalize any CSS color our tokens use into `#rrggbb` / `#rrggbbaa`.
 * Monaco rejects `rgba()`, and several tokens (line highlight, glows) are
 * authored that way, so this conversion is required rather than cosmetic.
 */
export function toHex(raw: string, fallback = '#000000'): string {
  const value = raw.trim();
  if (!value) return fallback;

  if (value.startsWith('#')) {
    if (value.length === 4 || value.length === 5) {
      // #rgb / #rgba → expand each nibble
      return '#' + value.slice(1).split('').map((c) => c + c).join('');
    }
    return value;
  }

  const fn = value.match(/^rgba?\(([^)]+)\)$/i);
  if (fn) {
    const parts = fn[1].split(/[,/\s]+/).filter(Boolean);
    const [r, g, b] = parts.slice(0, 3).map((p) => parseFloat(p));
    if ([r, g, b].some((n) => Number.isNaN(n))) return fallback;
    let hex = '#' + byteToHex(r) + byteToHex(g) + byteToHex(b);
    if (parts.length >= 4) {
      const a = parseFloat(parts[3]);
      if (!Number.isNaN(a) && a < 1) hex += byteToHex(a * 255);
    }
    return hex;
  }

  return fallback;
}

/** Read a resolved `--cv-*` token off <html>, with an SSR-safe fallback. */
export function readToken(name: string): string {
  const fallback = FALLBACKS[name] ?? '#000000';
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fallback;
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  return toHex(raw, fallback);
}

/** Monaco wants rule colors bare (`RRGGBB`), but `colors` entries prefixed. */
function bare(hex: string): string {
  return hex.replace('#', '').slice(0, 6);
}

export const MONACO_THEME_NAME: Record<SurfaceMode, string> = {
  light: 'cvai-light',
  dark: 'cvai-dark',
};

/**
 * Build a Monaco theme from the live tokens. Typed loosely so this module
 * doesn't need to import monaco-editor (which is client-only and heavy).
 */
export function buildMonacoTheme(mode: SurfaceMode) {
  const bg = readToken('--cv-editor-bg');
  const fg = readToken('--cv-editor-fg');
  const gutter = readToken('--cv-editor-gutter-fg');
  const selection = readToken('--cv-editor-selection');
  const lineHighlight = readToken('--cv-line-highlight');

  const keyword = bare(readToken('--cv-syn-keyword'));
  const string = bare(readToken('--cv-syn-string'));
  const number = bare(readToken('--cv-syn-number'));
  const comment = bare(readToken('--cv-syn-comment'));
  const builtin = bare(readToken('--cv-syn-builtin'));
  const decorator = bare(readToken('--cv-syn-decorator'));
  const operator = bare(readToken('--cv-syn-operator'));
  const klass = bare(readToken('--cv-syn-class'));
  const fn = bare(readToken('--cv-syn-function'));

  return {
    base: (mode === 'dark' ? 'vs-dark' : 'vs') as 'vs' | 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: bare(fg), background: bare(bg) },
      { token: 'comment', foreground: comment, fontStyle: 'italic' },
      { token: 'string', foreground: string },
      { token: 'string.escape', foreground: decorator },
      { token: 'number', foreground: number },
      { token: 'number.hex', foreground: number },
      { token: 'number.float', foreground: number },
      { token: 'keyword', foreground: keyword },
      { token: 'keyword.flow', foreground: keyword },
      { token: 'operator', foreground: operator },
      { token: 'delimiter', foreground: operator },
      { token: 'delimiter.bracket', foreground: operator },
      { token: 'delimiter.parenthesis', foreground: operator },
      { token: 'predefined', foreground: builtin },
      { token: 'type', foreground: klass },
      { token: 'type.identifier', foreground: klass },
      { token: 'namespace', foreground: klass },
      { token: 'annotation', foreground: decorator },
      { token: 'metatag', foreground: decorator },
      { token: 'tag', foreground: keyword },
      { token: 'attribute.name', foreground: fn },
      { token: 'function', foreground: fn },
      { token: 'identifier', foreground: bare(fg) },
      { token: 'variable', foreground: bare(fg) },
      { token: 'variable.predefined', foreground: builtin },
    ],
    colors: {
      'editor.background': bg,
      'editor.foreground': fg,
      'editorLineNumber.foreground': gutter,
      'editorLineNumber.activeForeground': fg,
      'editor.selectionBackground': selection,
      'editor.inactiveSelectionBackground': selection,
      'editor.lineHighlightBackground': lineHighlight,
      'editor.lineHighlightBorder': '#00000000',
      'editorCursor.foreground': readToken('--cv-console-cursor'),
      'editorGutter.background': bg,
      'editorWhitespace.foreground': gutter,
      'editorIndentGuide.background': readToken('--cv-border'),
      'editorIndentGuide.activeBackground': gutter,
      'editorWidget.background': bg,
      'editorWidget.border': readToken('--cv-border'),
      'editorSuggestWidget.background': bg,
      'editorHoverWidget.background': bg,
      'scrollbarSlider.background': readToken('--cv-border'),
      'scrollbarSlider.hoverBackground': gutter,
    },
  };
}

/**
 * ANSI ramps. These aren't design tokens — a terminal needs a full 16-color
 * palette, and the dark ramp is unreadable on white, so each mode gets one
 * tuned for its background.
 */
const ANSI: Record<SurfaceMode, Record<string, string>> = {
  light: {
    black: '#18181b',
    red: '#b91c1c',
    green: '#15803d',
    yellow: '#a16207',
    blue: '#1d4ed8',
    magenta: '#7e22ce',
    cyan: '#0e7490',
    white: '#3f3f46',
    brightBlack: '#71717a',
    brightRed: '#dc2626',
    brightGreen: '#16a34a',
    brightYellow: '#ca8a04',
    brightBlue: '#2563eb',
    brightMagenta: '#9333ea',
    brightCyan: '#0891b2',
    brightWhite: '#18181b',
  },
  dark: {
    black: '#27272a',
    red: '#f87171',
    green: '#4ade80',
    yellow: '#facc15',
    blue: '#60a5fa',
    magenta: '#c084fc',
    cyan: '#22d3ee',
    white: '#e4e4e7',
    brightBlack: '#52525b',
    brightRed: '#fca5a5',
    brightGreen: '#86efac',
    brightYellow: '#fde047',
    brightBlue: '#93c5fd',
    brightMagenta: '#d8b4fe',
    brightCyan: '#67e8f9',
    brightWhite: '#fafafa',
  },
};

/** Build an xterm.js ITheme from the live tokens. */
export function buildTerminalTheme(mode: SurfaceMode) {
  const bg = readToken('--cv-console-bg');
  const fg = readToken('--cv-console-fg');
  return {
    background: bg,
    foreground: fg,
    cursor: readToken('--cv-console-cursor'),
    cursorAccent: bg,
    selectionBackground: readToken('--cv-console-sel'),
    ...ANSI[mode],
  };
}
