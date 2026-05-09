'use client';

import type { StackFrame } from '@codevision/visualizer-engine';
import { FrameBox } from './FrameBox';

interface Props {
  // Original ordering: index 0 = oldest, last = active.
  frames: StackFrame[];
  changedVars: string[];
}

export function StackPanel({ frames, changedVars }: Props) {
  const changedSet = new Set(changedVars);

  // Reverse for display so the active (newest) frame appears on TOP.
  const displayFrames = frames
    .map((f, i) => ({ frame: f, frameIndex: i }))
    .reverse();

  if (frames.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm italic" style={{ color: 'var(--cv-muted)' }}>
        Call stack is empty
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto h-full">
      <div
        className="text-[10px] uppercase tracking-widest font-semibold"
        style={{ color: 'var(--cv-muted)' }}
      >
        Call Stack · {frames.length} frame{frames.length === 1 ? '' : 's'}
      </div>
      {displayFrames.map(({ frame, frameIndex }, displayIndex) => (
        <FrameBox
          key={frameIndex}
          frame={frame}
          frameIndex={frameIndex}
          isActive={displayIndex === 0}
          changedSet={changedSet}
        />
      ))}
    </div>
  );
}
