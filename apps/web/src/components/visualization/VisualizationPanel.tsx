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

/**
 * Walk all stack values + heap objects to compute the set of heap ids
 * actually reachable from the call stack. Anything not in this set is
 * pruned from the heap panel.
 */
function computeReachableIds(state: ExecutionState): Set<number> {
  const reachable = new Set<number>();
  const queue: number[] = [];

  const visitValue = (v: StackValue) => {
    if (v.kind === 'ref' && !reachable.has(v.id)) {
      reachable.add(v.id);
      queue.push(v.id);
    }
  };

  // Seed from every stack frame
  for (const frame of state.frames) {
    for (const v of Object.values(frame.locals)) visitValue(v);
    if (frame.returnValue) visitValue(frame.returnValue);
  }

  // BFS through heap → heap references
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
      className="relative flex-1 overflow-hidden"
      style={{ background: 'var(--cv-bg)' }}
    >
      <div className="absolute inset-0 flex">
        {/* Stack column ~40% of right area */}
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{ width: '42%', borderRight: '1px solid var(--cv-border)' }}
        >
          {state ? (
            <StackPanel frames={state.frames} changedVars={state.changedVars} />
          ) : (
            <EmptyHint isExecuting={isExecuting} stepCount={stepCount} />
          )}
        </div>

        {/* Heap column ~60% */}
        <div className="flex-1 overflow-hidden">
          {state ? (
            <HeapPanel heap={state.heap} reachableIds={reachable} />
          ) : (
            <EmptyHint isExecuting={isExecuting} stepCount={stepCount} subtle />
          )}
        </div>
      </div>

      {/* Bezier arrows overlay */}
      <ArrowLayer containerRef={containerRef} state={state} />

      {/* Start-Visualization gate (shown after Run finishes, before playback) */}
      {showOverlay && <StartVisualizationOverlay stepCount={stepCount} onStart={onStart} />}
    </div>
  );
}

function EmptyHint({
  isExecuting,
  stepCount,
  subtle,
}: {
  isExecuting: boolean;
  stepCount: number;
  subtle?: boolean;
}) {
  if (subtle) return null;
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
