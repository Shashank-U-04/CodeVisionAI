'use client';

import type { HeapObject as HeapObj } from '@codevision/visualizer-engine';
import { HeapObject } from './HeapObject';

interface Props {
  heap: Record<number, HeapObj>;
  // Only render objects reachable from the stack — pruning unreferenced
  // entries that may linger in the heap dict (e.g., __builtins__).
  reachableIds: Set<number>;
}

export function HeapPanel({ heap, reachableIds }: Props) {
  const objects = Object.values(heap)
    .filter((obj) => reachableIds.has(obj.id))
    .sort((a, b) => a.id - b.id);

  if (objects.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm italic" style={{ color: 'var(--cv-muted)' }}>
        Heap is empty
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto h-full">
      <div
        className="text-[10px] uppercase tracking-widest font-semibold"
        style={{ color: 'var(--cv-muted)' }}
      >
        Heap · {objects.length} object{objects.length === 1 ? '' : 's'}
      </div>
      {objects.map((obj) => (
        <HeapObject key={obj.id} object={obj} />
      ))}
    </div>
  );
}
