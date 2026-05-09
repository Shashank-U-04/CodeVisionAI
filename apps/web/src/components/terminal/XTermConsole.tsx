'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface XTermConsoleProps {
  onInputSubmit: (line: string) => void;
  // External imperative handle to write/clear from the parent.
  registerHandle: (h: XTermHandle) => void;
}

export interface XTermHandle {
  write: (text: string) => void;
  clear: () => void;
  setInputMode: (active: boolean) => void;
}

const APP_THEME = {
  background: '#09090b',     // zinc-950
  foreground: '#e4e4e7',     // zinc-200
  cursor:     '#60a5fa',     // blue-400
  cursorAccent: '#09090b',
  selectionBackground: '#3b82f680',
  black:   '#27272a',
  red:     '#f87171',
  green:   '#4ade80',
  yellow:  '#facc15',
  blue:    '#60a5fa',
  magenta: '#c084fc',
  cyan:    '#22d3ee',
  white:   '#e4e4e7',
  brightBlack:   '#52525b',
  brightRed:     '#fca5a5',
  brightGreen:   '#86efac',
  brightYellow:  '#fde047',
  brightBlue:    '#93c5fd',
  brightMagenta: '#d8b4fe',
  brightCyan:    '#67e8f9',
  brightWhite:   '#fafafa',
};

export function XTermConsole({ onInputSubmit, registerHandle }: XTermConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const inputModeRef = useRef(false);
  const inputBufferRef = useRef('');

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: APP_THEME,
      fontFamily: 'var(--font-geist-mono), Menlo, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.3,
      cursorBlink: true,
      cursorStyle: 'bar',
      convertEol: true,
      scrollback: 2000,
      disableStdin: false,
      allowProposedApi: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    termRef.current = term;
    fitRef.current = fit;

    // ─── Keystroke handler: only accept input when input mode is active ───
    term.onData((data) => {
      if (!inputModeRef.current) return;

      for (const ch of data) {
        const code = ch.charCodeAt(0);

        if (code === 13) {                    // Enter
          term.write('\r\n');
          const line = inputBufferRef.current;
          inputBufferRef.current = '';
          inputModeRef.current = false;       // disable until next prompt
          onInputSubmit(line);
        } else if (code === 127 || code === 8) {  // Backspace
          if (inputBufferRef.current.length > 0) {
            inputBufferRef.current = inputBufferRef.current.slice(0, -1);
            term.write('\b \b');
          }
        } else if (code === 3) {              // Ctrl+C — discard
          inputBufferRef.current = '';
          inputModeRef.current = false;
          term.write('^C\r\n');
        } else if (code >= 32 && code < 127) {
          inputBufferRef.current += ch;
          term.write(ch);
        }
      }
    });

    // ─── External imperative handle ───
    const handle: XTermHandle = {
      write: (text) => term.write(text),
      clear: () => {
        term.clear();
        inputBufferRef.current = '';
        inputModeRef.current = false;
      },
      setInputMode: (active) => {
        inputModeRef.current = active;
        if (active) term.focus();
      },
    };
    registerHandle(handle);

    // ─── Resize observer ───
    const ro = new ResizeObserver(() => {
      try { fit.fit(); } catch (_) {}
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
