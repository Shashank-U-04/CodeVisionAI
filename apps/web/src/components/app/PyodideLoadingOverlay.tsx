'use client';

import { useEffect, useState } from 'react';

/**
 * Full-screen overlay shown while Pyodide downloads + initializes on first run.
 * Visible only when status === 'initializing'.
 *
 * The progress indicator is intentionally indeterminate — we cannot know the
 * exact percent without instrumenting Pyodide's loader, but we can communicate
 * that the wait is expected and explain why.
 */
export function PyodideLoadingOverlay({ visible }: { visible: boolean }) {
  // Animate a subtle "tip" rotation so the user knows the page is alive.
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 4500);
    return () => clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'color-mix(in srgb, var(--cv-bg) 92%, transparent)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'var(--cv-font)',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          padding: 32,
          borderRadius: 'var(--cv-radius-xl)',
          background: 'var(--cv-panel)',
          border: '1px solid var(--cv-border)',
          boxShadow: 'var(--cv-shadow-xl)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            margin: '0 auto 18px',
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: '3px solid var(--cv-border)',
            borderTopColor: 'var(--cv-primary)',
            animation: 'cv-spin 0.9s linear infinite',
          }}
        />
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            margin: '0 0 8px',
            color: 'var(--cv-fg)',
            letterSpacing: '-0.01em',
          }}
        >
          Loading Pyodide
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--cv-muted)',
            margin: '0 0 18px',
            lineHeight: 1.55,
          }}
        >
          Starting an in-browser Python runtime (≈6 MB). This only happens once —
          subsequent visits are cached and instant.
        </p>

        <div
          aria-hidden="true"
          style={{
            position: 'relative',
            height: 4,
            borderRadius: 4,
            background: 'var(--cv-panel-deep)',
            overflow: 'hidden',
            marginBottom: 18,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '40%',
              borderRadius: 4,
              background: 'var(--cv-primary)',
              animation: 'cv-progress 1.5s ease-in-out infinite',
            }}
          />
        </div>

        <div
          style={{
            fontSize: 12.5,
            color: 'var(--cv-text-muted)',
            fontStyle: 'italic',
            minHeight: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            lineHeight: 1.5,
          }}
        >
          {TIPS[tipIndex]}
        </div>
      </div>

      <style>{`
        @keyframes cv-spin { to { transform: rotate(360deg); } }
        @keyframes cv-progress {
          0%   { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}

const TIPS = [
  'Tip: arrow keys step through execution once a trace is captured.',
  'Tip: press ? at any time for the keyboard shortcuts popover.',
  'Tip: click any line in the editor to jump the visualization to it.',
  'Tip: input() works — type into the console when prompted.',
];
