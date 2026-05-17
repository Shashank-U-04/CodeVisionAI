'use client';

import Link from 'next/link';
import { useThemeStore } from '@/stores/themeStore';
import { CodeVisionLogo } from './Nav';

function ThemeToggleBtn() {
  const { theme, toggle } = useThemeStore();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: 'var(--cv-radius-sm)',
        border: '1px solid var(--cv-border)', background: 'var(--cv-surface)',
        color: 'var(--cv-text-muted)', cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      {theme === 'dark' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export function LandingFooter() {
  const colStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10 };
  const headStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--cv-text)', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--cv-font)' };
  const linkStyle: React.CSSProperties = { fontSize: 14, color: 'var(--cv-text-muted)', textDecoration: 'none', transition: 'color 0.2s', fontFamily: 'var(--cv-font)' };

  return (
    <footer style={{ borderTop: '1px solid var(--cv-border)', background: 'var(--cv-surface)', padding: '56px 32px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48 }}>
        <div style={colStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CodeVisionLogo size={22} />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--cv-text)', letterSpacing: '-0.02em', fontFamily: 'var(--cv-font)' }}>
              CodeVision <span style={{ color: 'var(--cv-primary)' }}>AI</span>
            </span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--cv-text-muted)', lineHeight: 1.6, maxWidth: 280, fontFamily: 'var(--cv-font)' }}>
            See your code think. Step through Python execution with live visualization of variables, stacks, and heap objects.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <a href="https://github.com/Shashank-U-04/CodeVisionAI" target="_blank" rel="noopener noreferrer" aria-label="CodeVision AI on GitHub (opens in a new tab)" style={{ width: 32, height: 32, borderRadius: 'var(--cv-radius-sm)', border: '1px solid var(--cv-border)', background: 'var(--cv-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cv-text-muted)', textDecoration: 'none' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
            </a>
          </div>
        </div>

        <div style={colStyle}>
          <div style={headStyle}>Product</div>
          <Link href="/app" style={linkStyle}>Visualizer</Link>
          <Link href="/docs" style={linkStyle}>Docs</Link>
          <Link href="/changelog" style={linkStyle}>Changelog</Link>
          <Link href="/docs/supported-languages" style={linkStyle}>Languages</Link>
        </div>

        <div style={colStyle}>
          <div style={headStyle}>Learn</div>
          <Link href="/learn" style={linkStyle}>Tutorials</Link>
          <Link href="/learn/visualizing-recursion" style={linkStyle}>Recursion</Link>
          <Link href="/learn/understanding-the-call-stack" style={linkStyle}>The call stack</Link>
          <Link href="/learn/heap-vs-stack" style={linkStyle}>Heap vs stack</Link>
        </div>

        <div style={colStyle}>
          <div style={headStyle}>Project</div>
          <Link href="/about" style={linkStyle}>About</Link>
          <Link href="/docs/faq" style={linkStyle}>FAQ</Link>
          <a href="https://github.com/Shashank-U-04/CodeVisionAI" target="_blank" rel="noopener noreferrer" style={linkStyle}>GitHub ↗</a>
          <Link href="/docs/getting-started" style={linkStyle}>Getting started</Link>
        </div>
      </div>

      <div style={{
        maxWidth: 1200, margin: '32px auto 0', paddingTop: 24,
        borderTop: '1px solid var(--cv-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 13, color: 'var(--cv-text-faint)', fontFamily: 'var(--cv-font)' }}>
          &copy; 2026 CodeVision AI. All rights reserved.
        </span>
        <ThemeToggleBtn />
      </div>
    </footer>
  );
}
