'use client';

import { useEffect, useRef, useState } from 'react';
import type { Language } from '@/stores/languageStore';
import { EXAMPLES } from '@/lib/examples';

interface Props {
  language: Language;
  onPick: (code: string) => void;
  disabled?: boolean;
}

/**
 * "Try an example" dropdown for the editor header.
 * Closes on outside click, Escape, or selection.
 */
export function ExamplesDropdown({ language, onPick, disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const examples = EXAMPLES[language] ?? [];

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (examples.length === 0) return null;

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Load an example program"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 10px',
          borderRadius: 'var(--cv-radius-sm)',
          border: '1px solid var(--cv-border)',
          background: 'var(--cv-panel)',
          color: disabled ? 'var(--cv-text-faint)' : 'var(--cv-muted)',
          fontFamily: 'var(--cv-font)',
          fontSize: 11,
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = 'var(--cv-primary)';
            e.currentTarget.style.color = 'var(--cv-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = 'var(--cv-border)';
            e.currentTarget.style.color = 'var(--cv-muted)';
          }
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        Try an example
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 60,
            width: 280,
            padding: 6,
            borderRadius: 'var(--cv-radius)',
            background: 'var(--cv-panel)',
            border: '1px solid var(--cv-border)',
            boxShadow: 'var(--cv-shadow-lg)',
            fontFamily: 'var(--cv-font)',
          }}
        >
          {examples.map((ex) => (
            <button
              key={ex.id}
              role="menuitem"
              type="button"
              onClick={() => {
                onPick(ex.code);
                setOpen(false);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--cv-radius-sm)',
                border: 'none',
                background: 'transparent',
                color: 'var(--cv-fg)',
                fontFamily: 'var(--cv-font)',
                textAlign: 'left',
                cursor: 'pointer',
                gap: 2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cv-panel-deep)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>{ex.label}</span>
              <span style={{ fontSize: 11.5, color: 'var(--cv-muted)', lineHeight: 1.4 }}>
                {ex.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
