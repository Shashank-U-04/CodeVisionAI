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

export function VisualizationPanel({ state, status, hasStarted, stepCount, onStart }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const reachable = useMemo(
    () => (state ? computeReachableIds(state) : new Set<number>()),
    [state],
  );

  const showOverlay = !hasStarted && stepCount > 0;
  const isExecuting = status === 'running';

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-auto"
      style={{ background: 'var(--cv-bg)' }}
    >
      {state ? (
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
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 px-6 text-center">
      {isExecuting ? (
        <>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--cv-accent)' }} />
          <div className="text-sm" style={{ color: 'var(--cv-fg)' }}>
            Executing… {stepCount} steps captured
          </div>
          <div className="text-xs" style={{ color: 'var(--cv-muted)' }}>
            Visualization will be ready when execution completes.
          </div>
        </>
      ) : (
        <div className="text-sm italic" style={{ color: 'var(--cv-muted)' }}>
          Click <span className="font-bold" style={{ color: 'var(--cv-fg)' }}>▶ Run</span> to capture an execution trace.
        </div>
      )}
    </div>
  );
}
