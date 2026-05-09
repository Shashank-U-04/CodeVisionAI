'use client';

import type { ExecutionState } from '@codevision/visualizer-engine';

interface Props {
  state: ExecutionState | null;
  stepCount: number;
  viewIndex: number;
}

export function StepDescription({ state, stepCount, viewIndex }: Props) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-2 text-sm"
      style={{
        background: 'var(--cv-panel)',
        borderBottom: '1px solid var(--cv-border)',
      }}
    >
      <span
        className="text-[10px] uppercase tracking-widest font-semibold whitespace-nowrap"
        style={{ color: 'var(--cv-muted)' }}
      >
        {stepCount > 0 ? `step ${viewIndex + 1} / ${stepCount}` : 'no execution'}
      </span>
      <span style={{ color: 'var(--cv-border)' }}>·</span>
      <span className="font-mono text-xs flex-1 truncate" style={{ color: 'var(--cv-fg)' }}>
        {state?.description ?? <em style={{ color: 'var(--cv-muted)' }}>Waiting to start visualization…</em>}
      </span>
    </div>
  );
}
