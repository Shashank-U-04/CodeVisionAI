'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useThemeStore } from '@/stores/themeStore';
import { buildTerminalTheme } from '@/lib/surfaceTheme';

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

export function XTermConsole({ onInputSubmit, registerHandle }: XTermConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const inputModeRef = useRef(false);
  const inputBufferRef = useRef('');
  const theme = useThemeStore((s) => s.theme);

  // Recolor in place on theme flip. The terminal is deliberately NOT rebuilt —
  // tearing it down would wipe the scrollback of the current run.
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    const frame = requestAnimationFrame(() => {
      term.options.theme = buildTerminalTheme(theme);
    });
    return () => cancelAnimationFrame(frame);
  }, [theme]);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: buildTerminalTheme(useThemeStore.getState().theme),
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
