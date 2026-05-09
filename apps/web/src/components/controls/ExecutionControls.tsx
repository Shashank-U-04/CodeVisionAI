'use client';

import type { EngineStatus } from '@codevision/visualizer-engine';

interface Props {
  status: EngineStatus;
  onRun: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}

export function ExecutionControls({
  status,
  onRun,
  onStop,
  onPrev,
  onNext,
  canPrev,
  canNext,
}: Props) {
  const isRunning = status === 'running' || status === 'paused_on_input';
  const isInitializing = status === 'initializing';

  return (
    <div className="flex items-center gap-2">
      {isRunning ? (
        <button
          onClick={onStop}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
          style={{ background: 'var(--cv-danger)', color: 'white' }}
        >
          <StopIcon /> Stop
        </button>
      ) : (
        <button
          onClick={onRun}
          disabled={isInitializing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--cv-success)', color: 'white' }}
        >
          <PlayIcon /> Run
        </button>
      )}

      <div className="flex items-center gap-0.5 ml-1">
        <NavButton onClick={onPrev} disabled={!canPrev} title="Previous step (←)">
          <ChevronLeft />
        </NavButton>
        <NavButton onClick={onNext} disabled={!canNext} title="Next step (→)">
          <ChevronRight />
        </NavButton>
      </div>

      <StatusBadge status={status} />
    </div>
  );
}

function NavButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--cv-panel-deep)]"
      style={{ color: 'var(--cv-fg)' }}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: EngineStatus }) {
  const config: Record<EngineStatus, { dot: string; label: string }> = {
    initializing:    { dot: 'bg-yellow-500 animate-pulse', label: 'Loading Pyodide…' },
    idle:            { dot: 'bg-zinc-500',                 label: 'Ready' },
    running:         { dot: 'bg-emerald-500 animate-pulse', label: 'Executing' },
    paused_on_input: { dot: 'bg-blue-500 animate-pulse',   label: 'Awaiting input' },
    done:            { dot: 'bg-emerald-400',              label: 'Done' },
    error:           { dot: 'bg-red-500',                  label: 'Error' },
  };
  const { dot, label } = config[status];
  return (
    <span className="flex items-center gap-1.5 ml-2 text-[11px]" style={{ color: 'var(--cv-muted)' }}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

const PlayIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor"><path d="M2.5 1.5l7 4.5-7 4.5V1.5z" /></svg>
);
const StopIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="2" width="8" height="8" rx="1" /></svg>
);
const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
);
const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
);
