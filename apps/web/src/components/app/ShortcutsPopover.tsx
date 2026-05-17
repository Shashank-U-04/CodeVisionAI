'use client';

import { useEffect, useRef } from 'react';

interface Shortcut {
  keys: string[]; // each key rendered as a <kbd>
  label: string;
}

const SHORTCUTS: Array<{ group: string; items: Shortcut[] }> = [
  {
    group: 'Stepping',
    items: [
      { keys: ['→'], label: 'Step forward' },
      { keys: ['←'], label: 'Step backward' },
      { keys: ['↑'], label: 'Step backward' },
      { keys: ['↓'], label: 'Step forward' },
    ],
  },
  {
    group: 'Running',
    items: [
      { keys: ['Ctrl', 'Enter'], label: 'Run program' },
      { keys: ['Esc'], label: 'Stop running program' },
    ],
  },
  {
    group: 'Help',
    items: [
      { keys: ['?'], label: 'Open this dialog' },
      { keys: ['Esc'], label: 'Close this dialog' },
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsPopover({ open, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    // focus the close button so screen readers announce the dialog
    queueMicrotask(() => closeRef.current?.focus());
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cv-shortcuts-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 220,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'var(--cv-font)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          maxWidth: 460,
          width: '100%',
          background: 'var(--cv-panel)',
          border: '1px solid var(--cv-border)',
          borderRadius: 'var(--cv-radius-xl)',
          boxShadow: 'var(--cv-shadow-xl)',
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 id="cv-shortcuts-title" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--cv-fg)' }}>
            Keyboard shortcuts
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts dialog"
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--cv-radius-sm)',
              border: '1px solid var(--cv-border)',
              background: 'transparent',
              color: 'var(--cv-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {SHORTCUTS.map((g) => (
            <div key={g.group}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                  color: 'var(--cv-muted)',
                  marginBottom: 8,
                }}
              >
                {g.group}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {g.items.map((s, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: 'var(--cv-radius-sm)',
                      background: 'var(--cv-panel-deep)',
                      fontSize: 13,
                      color: 'var(--cv-fg)',
                    }}
                  >
                    <span>{s.label}</span>
                    <span style={{ display: 'inline-flex', gap: 4 }}>
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          style={{
                            fontFamily: 'var(--cv-font-mono)',
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: 'var(--cv-panel)',
                            border: '1px solid var(--cv-border)',
                            color: 'var(--cv-fg)',
                            minWidth: 22,
                            textAlign: 'center',
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop: 18,
            marginBottom: 0,
            fontSize: 12,
            color: 'var(--cv-muted)',
            fontStyle: 'italic',
          }}
        >
          The editor uses standard VS Code bindings (Ctrl+/ comment, Ctrl+D multi-cursor, etc.).
        </p>
      </div>
    </div>
  );
}
