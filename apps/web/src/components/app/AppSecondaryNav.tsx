'use client';

import Link from 'next/link';

interface Props {
  language: string;
  onOpenShortcuts: () => void;
}

/**
 * Slim secondary nav for the /app workspace:
 *  - Back-to-home link
 *  - Breadcrumb: Home › App › <Language>
 *  - Keyboard shortcuts helper button (opens the same popover as the `?` key)
 *
 * Intentionally compact (height ~32px) so it does not eat workspace real estate.
 * The parent page owns the shortcuts popover state so `?` key + button stay in sync.
 */
export function AppSecondaryNav({ language, onOpenShortcuts }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px',
        height: 32,
        background: 'var(--cv-panel-deep)',
        borderBottom: '1px solid var(--cv-border)',
        fontFamily: 'var(--cv-font)',
        fontSize: 12,
        color: 'var(--cv-muted)',
        flexShrink: 0,
      }}
    >
      <Link
        href="/"
        aria-label="Back to home"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          borderRadius: 'var(--cv-radius-sm)',
          color: 'var(--cv-muted)',
          textDecoration: 'none',
          fontWeight: 500,
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--cv-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--cv-muted)')}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to home
      </Link>

      <nav
        aria-label="Breadcrumb"
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}
      >
        <Link href="/" style={{ color: 'var(--cv-muted)', textDecoration: 'none' }}>Home</Link>
        <span aria-hidden="true" style={{ opacity: 0.5 }}>›</span>
        <span style={{ color: 'var(--cv-muted)' }}>App</span>
        <span aria-hidden="true" style={{ opacity: 0.5 }}>›</span>
        <span style={{ color: 'var(--cv-fg)', fontWeight: 600 }}>{language}</span>
      </nav>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link
          href="/docs/keyboard-shortcuts"
          style={{ color: 'var(--cv-muted)', textDecoration: 'none', fontWeight: 500 }}
        >
          Docs
        </Link>
        <button
          type="button"
          onClick={onOpenShortcuts}
          aria-label="Show keyboard shortcuts"
          title="Show keyboard shortcuts (?)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 8px',
            borderRadius: 'var(--cv-radius-sm)',
            border: '1px solid var(--cv-border)',
            background: 'var(--cv-panel)',
            color: 'var(--cv-muted)',
            fontFamily: 'var(--cv-font)',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <kbd
            style={{
              fontFamily: 'var(--cv-font-mono)',
              padding: '0 4px',
              fontSize: 10.5,
              borderRadius: 3,
              background: 'var(--cv-panel-deep)',
              color: 'var(--cv-fg)',
              border: '1px solid var(--cv-border)',
              minWidth: 14,
              textAlign: 'center',
            }}
          >
            ?
          </kbd>
          Shortcuts
        </button>
      </div>
    </div>
  );
}
