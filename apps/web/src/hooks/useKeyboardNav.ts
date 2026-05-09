'use client';

import { useEffect } from 'react';

/**
 * Wires ←/→ to step navigation. Ignores keys when the user is typing
 * inside an editor, terminal, or any input element.
 */
export function useKeyboardNav(prev: () => void, next: () => void) {
  useEffect(() => {
    function isEditableTarget(t: EventTarget | null): boolean {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
      if (t.isContentEditable) return true;
      // Monaco's editor textarea + xterm's helper textarea
      if (t.closest('.monaco-editor')) return true;
      if (t.closest('.xterm')) return true;
      return false;
    }

    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);
}
