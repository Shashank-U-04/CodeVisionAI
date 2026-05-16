'use client';

import type { StackFrame } from '@codevision/visualizer-engine';
import { FrameBox } from './FrameBox';

interface Props {
  // Original ordering: index 0 = oldest (global), last = active.
  frames: StackFrame[];
  changedVars: string[];
}

export function StackPanel({ frames, changedVars }: Props) {
  const changedSet = new Set(changedVars);

  // Python Tutor order: oldest (global) at top, newest (active) at bottom.
  const displayFrames = frames.map((f, i) => ({ frame: f, frameIndex: i }));

  if (frames.length === 0) {
    return (
      <div className="p-3 text-sm italic" style={{ color: 'var(--cv-muted)' }}>
        Call stack is empty
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div
        className="text-[10px] uppercase tracking-widest font-semibold"
        style={{ color: 'var(--cv-muted)' }}
      >
        Frames
      </div>
      {displayFrames.map(({ frame, frameIndex }, displayIndex) => (
        <FrameBox
          key={frameIndex}
          frame={frame}
          frameIndex={frameIndex}
          isActive={displayIndex === displayFrames.length - 1}
          changedSet={changedSet}
        />
      ))}
    </div>
  );
}
