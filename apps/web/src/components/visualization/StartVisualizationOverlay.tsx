'use client';

interface Props {
  stepCount: number;
  onStart: () => void;
}

export function StartVisualizationOverlay({ stepCount, onStart }: Props) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center backdrop-blur-sm z-30"
      style={{ background: 'color-mix(in oklab, var(--cv-bg) 70%, transparent)' }}
    >
      <button
        onClick={onStart}
        className="group flex flex-col items-center gap-3 px-8 py-6 rounded-2xl transition-all duration-200 hover:scale-105"
        style={{
          background: 'var(--cv-panel)',
          border: '1.5px solid var(--cv-active-border)',
          boxShadow: '0 0 0 4px var(--cv-active-glow), 0 12px 40px rgba(0,0,0,0.4)',
        }}
      >
        <span
          className="flex items-center justify-center w-14 h-14 rounded-full transition-transform group-hover:scale-110"
          style={{ background: 'var(--cv-active-border)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M5 4l14 8-14 8V4z" />
          </svg>
        </span>
        <div className="text-center">
          <div className="text-base font-bold" style={{ color: 'var(--cv-fg)' }}>
            Start Visualization
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--cv-muted)' }}>
            Step through {stepCount} execution snapshot{stepCount === 1 ? '' : 's'} from the beginning
          </div>
        </div>
      </button>
    </div>
  );
}
