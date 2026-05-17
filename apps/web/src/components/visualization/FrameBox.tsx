'use client';

import type { StackFrame } from '@codevision/visualizer-engine';
import { StackValueDisplay } from './StackValueDisplay';

interface Props {
  frame: StackFrame;
  frameIndex: number;             // index in original (oldest=0) order
  isActive: boolean;              // top of stack
  changedSet: Set<string>;        // var names that changed this step
}

export function FrameBox({ frame, frameIndex, isActive, changedSet }: Props) {
  const headerLabel = frame.isGlobal ? 'Global Frame' : `${frame.name}()`;
  const localEntries = Object.entries(frame.locals);
  const hasReturn = frame.returnValue !== undefined && frame.returnValue !== null;

  return (
    <div
      className="rounded-lg overflow-hidden transition-all duration-200"
      style={{
        border: isActive
          ? '1.5px solid var(--cv-active-border)'
          : '1px solid var(--cv-border)',
        background: isActive ? 'var(--cv-frame-active-bg)' : 'var(--cv-panel)',
        boxShadow: isActive ? '0 0 0 3px var(--cv-active-glow)' : 'none',
      }}
    >
      {/* Header */}
      <div
        className="flex items-baseline justify-between px-3 py-2 text-xs font-mono font-bold"
        style={{
          background: isActive ? 'var(--cv-active-header-bg)' : 'var(--cv-frame-header-bg)',
          color: isActive ? 'var(--cv-active-header-fg)' : 'var(--cv-fg)',
          borderBottom: '1px solid var(--cv-border)',
        }}
      >
        <span className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: isActive ? 'var(--cv-active-border)' : 'var(--cv-muted)',
              boxShadow: isActive ? '0 0 6px var(--cv-active-border)' : 'none',
            }}
          />
          {headerLabel}
        </span>
        <span className="font-normal text-[10px]" style={{ color: 'var(--cv-muted)' }}>
          line {frame.line}
        </span>
      </div>

      {/* Body */}
      {localEntries.length === 0 && !hasReturn ? (
        <div className="px-3 py-2 text-[11px] italic" style={{ color: 'var(--cv-muted)' }}>
          no local variables
        </div>
      ) : (
        <table className="w-full">
          <tbody>
            {localEntries.map(([key, val]) => {
              const changed = changedSet.has(`${frameIndex}.${key}`);
              return (
                <tr
                  key={key}
                  className={changed ? 'cv-flash' : ''}
                  style={{ borderTop: '1px solid var(--cv-border)' }}
                >
                  <td className="pl-3 pr-2 py-1.5 w-[42%] align-middle">
                    <span
                      className="font-mono text-[12px] font-bold"
                      style={{ color: 'var(--cv-fg)' }}
                    >
                      {key}
                    </span>
                  </td>
                  <td
                    className="pr-3 py-1.5 font-mono text-[12px] text-right"
                    data-arrow-source={`frame-${frameIndex}-${key}`}
                  >
                    <StackValueDisplay value={val} refAnchor={`frame-${frameIndex}-${key}`} />
                  </td>
                </tr>
              );
            })}
            {hasReturn && (
              <tr
                className={changedSet.has(`${frameIndex}.__return__`) ? 'cv-flash' : ''}
                style={{
                  borderTop: '1px solid var(--cv-border)',
                  background: 'var(--cv-return-bg)',
                }}
              >
                <td className="pl-3 pr-2 py-1.5 w-[42%]">
                  <span
                    className="font-mono text-[11px] italic font-bold"
                    style={{ color: 'var(--cv-return-fg)' }}
                  >
                    ↩ return value
                  </span>
                </td>
                <td
                  className="pr-3 py-1.5 font-mono text-[12px] text-right"
                  data-arrow-source={`frame-${frameIndex}-__return__`}
                >
                  <StackValueDisplay
                    value={frame.returnValue!}
                    refAnchor={`frame-${frameIndex}-__return__`}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
