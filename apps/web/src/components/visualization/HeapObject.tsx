'use client';

import type { HeapObject as HeapObj } from '@codevision/visualizer-engine';
import { StackValueDisplay } from './StackValueDisplay';

interface Props {
  object: HeapObj;
}

const TYPE_LABELS: Record<HeapObj['type'], string> = {
  list:     'list',
  tuple:    'tuple',
  dict:     'dict',
  set:      'set',
  function: 'function',
  class:    'class',
  instance: 'instance',
};

const TYPE_COLOR_VAR: Record<HeapObj['type'], string> = {
  list:     '--cv-heap-list',
  tuple:    '--cv-heap-tuple',
  dict:     '--cv-heap-dict',
  set:      '--cv-heap-set',
  function: '--cv-heap-function',
  class:    '--cv-heap-class',
  instance: '--cv-heap-instance',
};

export function HeapObject({ object }: Props) {
  const colorVar = TYPE_COLOR_VAR[object.type];
  const label = TYPE_LABELS[object.type];
  const idHex = '0x' + object.id.toString(16).slice(-6);

  return (
    <div
      data-heap-id={object.id}
      className="inline-flex flex-col rounded-lg overflow-hidden shadow-md"
      style={{
        border: `1.5px solid var(${colorVar})`,
        background: `color-mix(in oklab, var(${colorVar}) 8%, var(--cv-panel))`,
        minWidth: 'min-content',
      }}
    >
      {/* Header */}
      <div
        className="flex items-baseline justify-between px-3 py-1.5 text-xs font-mono font-semibold"
        style={{
          background: `color-mix(in oklab, var(${colorVar}) 18%, transparent)`,
          color: `var(${colorVar})`,
        }}
      >
        <span>
          {object.type === 'instance' ? object.className : label}
          {object.type === 'instance' && (
            <span
              className="ml-1.5 font-normal"
              style={{ color: 'var(--cv-muted)' }}
            >
              instance
            </span>
          )}
        </span>
        <span className="text-[10px] font-normal" style={{ color: 'var(--cv-muted)' }}>
          id: {idHex}
        </span>
      </div>

      {/* Body */}
      <div className="p-2">
        {renderBody(object)}
      </div>
    </div>
  );
}

function renderBody(obj: HeapObj) {
  switch (obj.type) {
    case 'list':
    case 'tuple':
      return <SequenceCells obj={obj} />;
    case 'set':
      return <SetCells obj={obj} />;
    case 'dict':
      return <DictTable obj={obj} />;
    case 'instance':
      return <InstanceTable obj={obj} />;
    case 'function':
      return (
        <span className="text-xs italic" style={{ color: 'var(--cv-muted)' }}>
          fn {obj.name}
        </span>
      );
    case 'class':
      return (
        <span className="text-xs italic" style={{ color: 'var(--cv-muted)' }}>
          class {obj.name}
        </span>
      );
  }
}

// ─── List / Tuple — indexed cells in a row ───────────────────────────────

function SequenceCells({ obj }: { obj: { id: number; elements: import('@codevision/visualizer-engine').StackValue[] } }) {
  if (obj.elements.length === 0) {
    return <span className="text-xs italic" style={{ color: 'var(--cv-muted)' }}>empty</span>;
  }
  return (
    <div className="flex gap-0 flex-wrap">
      {obj.elements.map((el, i) => (
        <div
          key={i}
          className="flex flex-col items-stretch border-r last:border-r-0"
          style={{ borderColor: 'var(--cv-border)' }}
        >
          <div
            className="text-[10px] text-center px-2 py-0.5 font-mono"
            style={{ color: 'var(--cv-muted)', background: 'var(--cv-panel-deep)' }}
          >
            {i}
          </div>
          <div className="px-2 py-1.5 text-center min-w-[28px]">
            <StackValueDisplay value={el} refAnchor={`heap-${obj.id}-i${i}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Set — chip layout (no indices) ──────────────────────────────────────

function SetCells({ obj }: { obj: { id: number; elements: import('@codevision/visualizer-engine').StackValue[] } }) {
  if (obj.elements.length === 0) {
    return <span className="text-xs italic" style={{ color: 'var(--cv-muted)' }}>empty</span>;
  }
  return (
    <div className="flex gap-1.5 flex-wrap">
      {obj.elements.map((el, i) => (
        <div
          key={i}
          className="px-2.5 py-1 rounded-md"
          style={{ border: '1px solid var(--cv-border)', background: 'var(--cv-panel-deep)' }}
        >
          <StackValueDisplay value={el} refAnchor={`heap-${obj.id}-s${i}`} />
        </div>
      ))}
    </div>
  );
}

// ─── Dict — two-column table ─────────────────────────────────────────────

function DictTable({ obj }: { obj: { id: number; pairs: Array<[import('@codevision/visualizer-engine').StackValue, import('@codevision/visualizer-engine').StackValue]> } }) {
  if (obj.pairs.length === 0) {
    return <span className="text-xs italic" style={{ color: 'var(--cv-muted)' }}>empty</span>;
  }
  return (
    <table className="text-xs">
      <tbody>
        {obj.pairs.map(([k, v], i) => (
          <tr key={i} style={{ borderTop: i > 0 ? '1px solid var(--cv-border)' : 'none' }}>
            <td className="py-1 pr-3" style={{ color: 'var(--cv-muted)' }}>
              <StackValueDisplay value={k} refAnchor={`heap-${obj.id}-k${i}`} />
            </td>
            <td className="py-1 pl-3 text-right">
              <StackValueDisplay value={v} refAnchor={`heap-${obj.id}-v${i}`} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Instance — class header + attribute rows ────────────────────────────

function InstanceTable({ obj }: { obj: { id: number; attrs: Record<string, import('@codevision/visualizer-engine').StackValue> } }) {
  const entries = Object.entries(obj.attrs);
  if (entries.length === 0) {
    return <span className="text-xs italic" style={{ color: 'var(--cv-muted)' }}>no attributes</span>;
  }
  return (
    <table className="text-xs">
      <tbody>
        {entries.map(([k, v], i) => (
          <tr key={k} style={{ borderTop: i > 0 ? '1px solid var(--cv-border)' : 'none' }}>
            <td className="py-1 pr-3 font-mono font-bold" style={{ color: 'var(--cv-fg)' }}>
              {k}
            </td>
            <td className="py-1 pl-3 text-right">
              <StackValueDisplay value={v} refAnchor={`heap-${obj.id}-a-${k}`} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
