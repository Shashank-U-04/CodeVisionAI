'use client';

import { useEffect, useRef, useCallback } from 'react';
import { VisualizerEngine } from '@codevision/visualizer-engine';
import type { EngineEvent } from '@codevision/visualizer-engine';
import { useExecutionStore } from '@/stores/executionStore';
import type { XTermHandle } from '@/components/terminal/XTermConsole';

export function useEngine() {
  const engineRef = useRef<VisualizerEngine | null>(null);
  const termRef = useRef<XTermHandle | null>(null);
  const store = useExecutionStore();

  const buildHandlers = useCallback((engine: VisualizerEngine) => {
    engine.onEvent = (event: EngineEvent) => {
      const term = termRef.current;
      switch (event.type) {
        case 'READY':
          useExecutionStore.getState().setStatus('idle');
          break;
        case 'STEP':
          useExecutionStore.getState().addStep(event.state);
          break;
        case 'OUTPUT':
          useExecutionStore.getState().appendOutput(event.value);
          term?.write(event.value.replace(/\n/g, '\r\n'));
          break;
        case 'INPUT_REQUEST':
          useExecutionStore.getState().setInputRequest({ prompt: event.prompt });
          useExecutionStore.getState().setStatus('paused_on_input');
          term?.setInputMode(true);
          break;
        case 'DONE':
          useExecutionStore.getState().setStatus('done');
          break;
        case 'ERROR':
          useExecutionStore.getState().setError(event.message);
          useExecutionStore.getState().setStatus('error');
          term?.write(`\r\n\x1b[31m${event.message}\x1b[0m\r\n`);
          break;
      }
    };
  }, []);

  useEffect(() => {
    let engine: VisualizerEngine;
    try {
      engine = new VisualizerEngine();
    } catch (err) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registerTerminal = useCallback((h: XTermHandle) => {
    termRef.current = h;
  }, []);

  const run = useCallback((code: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    store.reset();
    termRef.current?.clear();
    store.setStatus('running');
    engine.run(code);
  }, [store]);

  const provideInput = useCallback((value: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    store.setInputRequest(null);
    store.setStatus('running');
    engine.provideInput(value);
  }, [store]);

  const stop = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.dispose();
    engineRef.current = null;
    store.reset();
    store.setStatus('initializing');
    termRef.current?.clear();

    try {
      const fresh = new VisualizerEngine();
      buildHandlers(fresh);
      engineRef.current = fresh;
      fresh.initialize();
    } catch (err) {
      store.setStatus('error');
      store.setError(err instanceof Error ? err.message : String(err));
    }
  }, [store, buildHandlers]);

  return { run, provideInput, stop, registerTerminal };
}
