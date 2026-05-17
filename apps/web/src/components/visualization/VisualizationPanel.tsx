'use client';

import { useMemo, useRef } from 'react';
import type { ExecutionState, HeapObject, StackValue } from '@codevision/visualizer-engine';
import { StackPanel } from './StackPanel';
import { HeapPanel } from './HeapPanel';
import { ArrowLayer } from './ArrowLayer';
import { StartVisualizationOverlay } from './StartVisualizationOverlay';

interface Props {
  state: ExecutionState | null;
  status: import('@codevision/visualizer-engine').EngineStatus;
  hasStarted: boolean;
  stepCount: number;
  onStart: () => void;
  error?: string | null;
}

function computeReachableIds(state: ExecutionState): Set<number> {
  const reachable = new Set<number>();
  const queue: number[] = [];

  const visitValue = (v: StackValue) => {
    if (v.kind === 'ref' && !reachable.has(v.id)) {
      reachable.add(v.id);
      queue.push(v.id);
    }
  };

  for (const frame of state.frames) {
    for (const v of Object.values(frame.locals)) visitValue(v);
    if (frame.returnValue) visitValue(frame.returnValue);
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    const obj = state.heap[id];
    if (!obj) continue;
    walkHeapObject(obj, visitValue);
  }
  return reachable;
}

function walkHeapObject(obj: HeapObject, fn: (v: StackValue) => void) {
  switch (obj.type) {
    case 'list':
    case 'tuple':
    case 'set':
      obj.elements.forEach(fn);
      break;
    case 'dict':
      obj.pairs.forEach((pair: [StackValue, StackValue]) => { fn(pair[0]); fn(pair[1]); });
      break;
    case 'instance':
      Object.values(obj.attrs).forEach(fn);
      break;
    case 'function':
    case 'class':
      break;
  }
}

export function VisualizationPanel({ state, status, hasStarted, stepCount, onStart, error }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const reachable = useMemo(
    () => (state ? computeReachableIds(state) : new Set<number>()),
    [state],
  );

  const showOverlay = !hasStarted && stepCount > 0;
  const isExecuting = status === 'running';
  const hasError = !!error && status === 'error';

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-auto"
      style={{ background: 'var(--cv-bg)' }}
    >
      {hasError && state && <ErrorBanner message={error!} />}

      {hasError && !state ? (
        <ErrorEmptyState message={error!} />
      ) : state ? (
        // Python Tutor-style layout: Frames column | wire gap | Objects column.
        // Both columns live in ONE scrollable container so they scroll together.
        // fit-content(230px) auto-sizes the frames column to its content (max 230px).
        <div style={{ display: 'grid', gridTemplateColumns: 'fit-content(230px) 1fr', minHeight: '100%' }}>
          {/* Frames column — shrinks to widest variable name + value */}
          <div style={{ minWidth: '130px', borderRight: '1px solid var(--cv-border)' }}>
            <StackPanel frames={state.frames} changedVars={state.changedVars} />
          </div>

          {/* Objects column — padding-left creates the wire-gap for arrows */}
          <div style={{ minWidth: '280px', paddingLeft: '96px' }}>
            <HeapPanel heap={state.heap} reachableIds={reachable} />
          </div>
        </div>
      ) : (
        <EmptyHint isExecuting={isExecuting} stepCount={stepCount} />
      )}

      {/* Bezier arrows — positioned in content-coordinate space */}
      <ArrowLayer containerRef={containerRef} state={state} />

      {showOverlay && <StartVisualizationOverlay stepCount={stepCount} onStart={onStart} />}
    </div>
  );
}

function EmptyHint({
  isExecuting,
  stepCount,
}: {
  isExecuting: boolean;
  stepCount: number;
}) {
  if (isExecuting) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: 'var(--cv-accent)' }}
        />
        <div className="text-sm font-medium" style={{ color: 'var(--cv-fg)' }}>
          Executing… {stepCount} steps captured
        </div>
        <div className="text-xs" style={{ color: 'var(--cv-muted)', maxWidth: 280 }}>
          Visualization will be ready when execution completes.
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center"
      style={{ fontFamily: 'var(--cv-font)' }}
    >
      {/* Play-button illustration with concentric "pulse" rings */}
      <div
        aria-hidden="true"
        style={{
          position: 'relative',
          width: 96,
          height: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '1px dashed var(--cv-border)',
            opacity: 0.7,
          }}
        />
        <span
          style={{
            position: 'absolute',
            inset: 14,
            borderRadius: '50%',
            border: '1px dashed var(--cv-border)',
            opacity: 0.5,
          }}
        />
        <span
          style={{
            position: 'relative',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--cv-primary-subtle)',
            border: '1.5px solid var(--cv-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--cv-primary)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 4 20 12 6 20 6 4" />
          </svg>
        </span>
      </div>

      <div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--cv-fg)',
            marginBottom: 4,
            letterSpacing: '-0.01em',
          }}
        >
          Click Run to start.
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--cv-muted)',
            lineHeight: 1.55,
            maxWidth: 320,
          }}
        >
          Your call stack and heap objects appear here as soon as the visualizer
          captures a trace.
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      style={{
        background: 'rgba(220,38,38,0.10)',
        borderBottom: '1px solid rgba(220,38,38,0.35)',
        padding: '10px 14px',
        fontFamily: 'var(--cv-font-mono)',
        fontSize: 12,
        color: '#dc2626',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.5,
      }}
    >
      <strong style={{ fontFamily: 'var(--cv-font)' }}>Execution failed.</strong>{' '}
      {message}
    </div>
  );
}

function ErrorEmptyState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center"
      style={{ fontFamily: 'var(--cv-font)' }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(220,38,38,0.10)',
          border: '1.5px solid rgba(220,38,38,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#dc2626',
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--cv-fg)',
            marginBottom: 6,
            letterSpacing: '-0.01em',
          }}
        >
          Execution failed
        </div>
        <pre
          style={{
            fontSize: 12,
            color: '#dc2626',
            fontFamily: 'var(--cv-font-mono)',
            background: 'rgba(220,38,38,0.06)',
            border: '1px solid rgba(220,38,38,0.25)',
            borderRadius: 8,
            padding: '12px 14px',
            margin: 0,
            maxWidth: 560,
            maxHeight: 280,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            textAlign: 'left',
            lineHeight: 1.5,
          }}
        >
          {message}
        </pre>
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: 'var(--cv-muted)',
            maxWidth: 480,
            margin: '12px auto 0',
            lineHeight: 1.55,
          }}
        >
          Fix the issue in the editor and click Run again. The error is also echoed
          in the console below.
        </div>
      </div>
    </div>
  );
}
