'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ExecutionState } from '@codevision/visualizer-engine';
import { cubicHorizontal, rightAnchor, leftAnchor, colorForId } from '@/lib/arrows';

interface Props {
  // The container whose coordinate space we draw in (right column).
  containerRef: React.RefObject<HTMLDivElement | null>;
  state: ExecutionState | null;
}

interface ArrowSpec {
  key: string;
  d: string;
  color: string;
}

export function ArrowLayer({ containerRef, state }: Props) {
  const [arrows, setArrows] = useState<ArrowSpec[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const rafRef = useRef<number | null>(null);

  // Recompute paths whenever the state changes OR the container resizes.
  const recompute = () => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    setSize({ w: rect.width, h: rect.height });

    if (!state) {
      setArrows([]);
      return;
    }

    const next: ArrowSpec[] = [];

    // Every reference cell — both in stack frames and inside heap objects —
    // is rendered with a [data-arrow-source] attribute carrying its key.
    // We pair each one with the matching heap object box [data-heap-id].
    const sources = container.querySelectorAll<HTMLElement>('[data-arrow-source]');

    sources.forEach((srcEl) => {
      const refIdAttr = srcEl.querySelector<HTMLElement>('[data-ref-id]')?.dataset.refId;
      if (!refIdAttr) return;
      const refId = Number(refIdAttr);
      const target = container.querySelector<HTMLElement>(`[data-heap-id="${refId}"]`);
      if (!target) return;

      const from = rightAnchor(srcEl, container);
      const to = leftAnchor(target, container);
      next.push({
        key: `${srcEl.dataset.arrowSource}->${refId}`,
        d: cubicHorizontal(from, to),
        color: colorForId(refId),
      });
    });

    setArrows(next);
  };

  useLayoutEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(recompute);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(recompute);
    });
    ro.observe(container);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={size.w}
      height={size.h}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* One arrowhead per palette color */}
        {Array.from(new Set(arrows.map((a) => a.color))).map((color) => (
          <marker
            key={color}
            id={`arrowhead-${color.slice(1)}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
      </defs>
      {arrows.map((a) => (
        <path
          key={a.key}
          d={a.d}
          fill="none"
          stroke={a.color}
          strokeWidth={1.5}
          strokeOpacity={0.9}
          markerEnd={`url(#arrowhead-${a.color.slice(1)})`}
          style={{
            transition: 'd 200ms ease-out, stroke 200ms ease-out',
          }}
        />
      ))}
    </svg>
  );
}
