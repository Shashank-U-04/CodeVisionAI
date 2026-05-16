'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useThemeStore } from '@/stores/themeStore';

export function CodeVisionLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="var(--cv-primary)" />
      <path d="M10 12L14 16L10 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 20H22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ThemeToggleBtn() {
  const { theme, toggle } = useThemeStore();
  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, borderRadius: 'var(--cv-radius)',
        border: '1px solid var(--cv-border)', background: 'var(--cv-surface)',
        color: 'var(--cv-text)', cursor: 'pointer', transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--cv-surface-deep)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--cv-surface)')}
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export function Nav({ activePage = 'home' }: { activePage?: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 14, fontWeight: 500, textDecoration: 'none',
    color: active ? 'var(--cv-primary)' : 'var(--cv-text-muted)',
    transition: 'color 0.2s',
    padding: '6px 12px', borderRadius: 'var(--cv-radius-sm)',
    fontFamily: 'var(--cv-font)',
  });

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', height: 60,
      background: scrolled ? 'color-mix(in srgb, var(--cv-surface) 90%, transparent)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px) saturate(1.4)' : 'none',
      borderBottom: scrolled ? '1px solid var(--cv-border)' : '1px solid transparent',
      transition: 'all 0.3s ease',
      fontFamily: 'var(--cv-font)',
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <CodeVisionLogo size={24} />
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--cv-text)', letterSpacing: '-0.02em', fontFamily: 'var(--cv-font)' }}>
          CodeVision <span style={{ color: 'var(--cv-primary)' }}>AI</span>
        </span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Link href="/" style={linkStyle(activePage === 'home')}>Home</Link>
        <Link href="/app" style={linkStyle(activePage === 'app')}>Visualizer</Link>
        <a href="#learn" style={linkStyle(activePage === 'learn')}>Learn</a>
        <a href="#examples" style={linkStyle(activePage === 'examples')}>Examples</a>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ThemeToggleBtn />
        <Link href="/app" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 18px', borderRadius: 'var(--cv-radius)',
          background: 'var(--cv-primary)', color: 'var(--cv-primary-text)',
          fontWeight: 600, fontSize: 13, textDecoration: 'none',
          fontFamily: 'var(--cv-font)', transition: 'all 0.2s ease',
        }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cv-primary-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--cv-primary)')}
        >
          Try it Free
        </Link>
      </div>
    </nav>
  );
}
