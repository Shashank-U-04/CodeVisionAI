'use client';

import type { StackValue } from '@codevision/visualizer-engine';

interface Props {
  value: StackValue;
  // Set when this slot is a ref — used by ArrowLayer to anchor arrows.
  refAnchor?: string;
}

/**
 * Renders a single stack value: either inline text (primitive) or
 * a small ref-dot anchor (for heap arrows).
 */
export function StackValueDisplay({ value, refAnchor }: Props) {
  if (value.kind === 'primitive') {
    return <PrimitiveText type={value.type} value={value.value} />;
  }
  return (
    <span
      data-arrow-source={refAnchor}
      data-ref-id={value.id}
      className="inline-flex items-center gap-1.5"
    >
      <span className="w-2 h-2 rounded-full bg-[var(--cv-arrow)] shadow-[0_0_6px_var(--cv-arrow)]" />
      <span className="text-[10px] text-[var(--cv-muted)] font-mono">
        →{value.id.toString(16).slice(-4)}
      </span>
    </span>
  );
}

function PrimitiveText({
  type,
  value,
}: {
  type: 'int' | 'float' | 'str' | 'bool' | 'None';
  value: string | number | boolean | null;
}) {
  switch (type) {
    case 'None':
      return <span className="text-[var(--cv-muted)] font-bold">None</span>;
    case 'bool':
      return <span className="text-[var(--cv-bool)] font-bold">{String(value)}</span>;
    case 'int':
      return <span className="text-[var(--cv-int)] font-bold">{String(value)}</span>;
    case 'float':
      return <span className="text-[var(--cv-float)] font-bold">{String(value)}</span>;
    case 'str':
      return (
        <span className="text-[var(--cv-str)] font-bold">
          &quot;{String(value)}&quot;
        </span>
      );
  }
}
