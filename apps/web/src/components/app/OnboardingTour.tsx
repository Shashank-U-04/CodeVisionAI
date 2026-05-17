'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'codevision:onboarding-dismissed';

interface Step {
  title: string;
  body: string;
  /** screen position — keeps each tooltip near the relevant area without DOM-binding */
  anchor: 'left-top' | 'left-bottom' | 'right-top';
}

const STEPS: Step[] = [
  {
    title: '1. Write code',
    body: 'Type or paste Python on the left. The editor uses VS Code keybindings — Ctrl+/ to comment, Ctrl+D for multi-cursor, the usual.',
    anchor: 'left-top',
  },
  {
    title: '2. Click Run',
    body: 'The Run button in the top bar executes your code in a sandboxed worker. You will see output appear in the console below the editor.',
    anchor: 'left-bottom',
  },
  {
    title: '3. Step through with arrows',
    body: 'Use ← → (or the Prev/Next buttons) to walk through execution. The Frames and Objects panels on the right show state at each step.',
    anchor: 'right-top',
  },
];

/**
 * First-run onboarding overlay shown the first time someone lands on /app
 * with a supported language. Sets localStorage on dismissal so it does not
 * reappear. Intentionally minimal and skippable — never blocks the page.
 */
export function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  // Only run client-side; checks localStorage on mount.
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setActive(true);
    } catch {
      // localStorage may be unavailable (private mode); just skip the tour
    }
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const dismiss = () => {
    setActive(false);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else dismiss();
  };

  const prev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  if (!active) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* Lightweight dimmer — non-blocking, just visual focus */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 150,
          background: 'rgba(0,0,0,0.35)',
          pointerEvents: 'auto',
        }}
        onClick={dismiss}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv-onboarding-title"
        style={{
          position: 'fixed',
          ...positionFor(current.anchor),
          zIndex: 160,
          width: 'min(360px, calc(100vw - 32px))',
          padding: 20,
          borderRadius: 'var(--cv-radius-lg)',
          background: 'var(--cv-panel)',
          border: '1px solid var(--cv-primary)',
          boxShadow: '0 24px 48px -12px rgba(0,0,0,0.25), 0 0 0 4px var(--cv-primary-subtle)',
          fontFamily: 'var(--cv-font)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 700,
              color: 'var(--cv-primary)',
            }}
          >
            Quick tour · {step + 1} of {STEPS.length}
          </span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Skip tour"
            style={{
              width: 24,
              height: 24,
              borderRadius: 'var(--cv-radius-sm)',
              border: 'none',
              background: 'transparent',
              color: 'var(--cv-muted)',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <h3
          id="cv-onboarding-title"
          style={{
            margin: '0 0 8px',
            fontSize: 17,
            fontWeight: 700,
            color: 'var(--cv-fg)',
            letterSpacing: '-0.01em',
          }}
        >
          {current.title}
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--cv-muted)' }}>
          {current.body}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {STEPS.map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                style={{
                  width: 18,
                  height: 4,
                  borderRadius: 4,
                  background: i === step ? 'var(--cv-primary)' : 'var(--cv-border)',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
          {step > 0 && (
            <button
              type="button"
              onClick={prev}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--cv-radius-sm)',
                border: '1px solid var(--cv-border)',
                background: 'transparent',
                color: 'var(--cv-fg)',
                fontFamily: 'var(--cv-font)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={next}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--cv-radius-sm)',
              border: 'none',
              background: 'var(--cv-primary)',
              color: 'var(--cv-primary-text)',
              fontFamily: 'var(--cv-font)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isLast ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
}

function positionFor(anchor: Step['anchor']): React.CSSProperties {
  switch (anchor) {
    case 'left-top':
      return { top: 96, left: 24 };
    case 'left-bottom':
      return { bottom: 80, left: 24 };
    case 'right-top':
      return { top: 96, right: 24 };
  }
}
