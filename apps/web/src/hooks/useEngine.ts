'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createEngine } from '@codevision/visualizer-engine';
import type { Engine, EngineEvent, EngineLanguage } from '@codevision/visualizer-engine';
import { useExecutionStore } from '@/stores/executionStore';
import { useLanguageStore } from '@/stores/languageStore';
import type { XTermHandle } from '@/components/terminal/XTermConsole';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

// `python` runs in-browser via Pyodide; everything else streams from the
// FastAPI backend. Keeping this map here means the workspace doesn't need
// to know about engine selection.
function engineLanguageFor(uiLanguage: string | null): EngineLanguage {
  if (uiLanguage === 'c' || uiLanguage === 'cpp' || uiLanguage === 'java') {
    return uiLanguage;
  }
  return 'python';
}

export function useEngine() {
  const engineRef = useRef<Engine | null>(null);
  const termRef = useRef<XTermHandle | null>(null);

  const selectedLanguage = useLanguageStore((s) => s.selectedLanguage);

  const buildHandlers = useCallback((engine: Engine) => {
    engine.onEvent = (event: EngineEvent) => {
      const term = termRef.current;
      const store = useExecutionStore.getState();
      switch (event.type) {
        case 'READY':
          store.setStatus('idle');
          break;
        case 'STEP':
          store.addStep(event.state);
          break;
        case 'OUTPUT': {
          // Tracers disagree on line endings: GDB and the JVM emit CRLF on
          // Windows while Pyodide emits LF. Canonicalize to LF once so the
          // store holds a consistent transcript, then expand to CRLF for the
          // terminal. Without this, CRLF input became "\r\r\n" and
          // double-spaced every line of C/C++/Java output.
          const text = event.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          store.appendOutput(text);
          term?.write(text.replace(/\n/g, '\r\n'));
          break;
        }
        case 'INPUT_REQUEST':
          store.setInputRequest({ prompt: event.prompt });
          store.setStatus('paused_on_input');
          term?.setInputMode(true);
          break;
        case 'DONE':
          store.setStatus('done');
          break;
        case 'ERROR':
          store.setError(event.message);
          store.setStatus('error');
          term?.write(`\r\n\x1b[31m${event.message}\x1b[0m\r\n`);
          break;
      }
    };
  }, []);

  // Recreate the engine when the language changes (Python <-> server).
  useEffect(() => {
    const language = engineLanguageFor(selectedLanguage);
    let engine: Engine;
    try {
      engine = createEngine({ language, apiBase: API_BASE });
    } catch (err) {
      const store = useExecutionStore.getState();
      store.setStatus('error');
      store.setError(err instanceof Error ? err.message : String(err));
      return;
    }

    engineRef.current = engine;
    buildHandlers(engine);
    engine.initialize();

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [selectedLanguage, buildHandlers]);

  const registerTerminal = useCallback((h: XTermHandle) => {
    termRef.current = h;
  }, []);

  const run = useCallback((code: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    const store = useExecutionStore.getState();
    store.reset();
    termRef.current?.clear();
    store.setStatus('running');
    void engine.run(code);
  }, []);

  const provideInput = useCallback((value: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    const store = useExecutionStore.getState();
    store.setInputRequest(null);
    store.setStatus('running');
    void engine.provideInput(value);
  }, []);

  const stop = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.dispose();
    engineRef.current = null;
    const store = useExecutionStore.getState();
    store.reset();
    store.setStatus('initializing');
    termRef.current?.clear();

    const language = engineLanguageFor(useLanguageStore.getState().selectedLanguage);
    try {
      const fresh = createEngine({ language, apiBase: API_BASE });
      buildHandlers(fresh);
      engineRef.current = fresh;
      fresh.initialize();
    } catch (err) {
      const errStore = useExecutionStore.getState();
      errStore.setStatus('error');
      errStore.setError(err instanceof Error ? err.message : String(err));
    }
  }, [buildHandlers]);

  return { run, provideInput, stop, registerTerminal };
}
