'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useThemeStore } from '@/stores/themeStore';

export function CodeVisionLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--cv-primary)" />
      <path d="M10 12L14 16L10 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 20H22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

interface NavLinkDef {
  href: string;
  label: string;
  /** match path prefix for active state — falls back to exact equality */
  match?: string;
}

const NAV_LINKS: NavLinkDef[] = [
  { href: '/', label: 'Home' },
  { href: '/learn', label: 'Learn', match: '/learn' },
  { href: '/docs', label: 'Docs', match: '/docs' },
  { href: '/about', label: 'About', match: '/about' },
  { href: '/changelog', label: 'Changelog', match: '/changelog' },
];

function isActive(pathname: string, link: NavLinkDef): boolean {
  if (link.match) return pathname === link.match || pathname.startsWith(link.match + '/');
  return pathname === link.href;
}

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
        width: 36, height: 36, borderRadius: 'var(--cv-radius)',
        border: '1px solid var(--cv-border)', background: 'var(--cv-surface)',
        color: 'var(--cv-text)', cursor: 'pointer', transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cv-surface-deep)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--cv-surface)')}
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

/**
 * SiteNav — top navigation shared across all public marketing/content routes.
 * - Sticky, blurs on scroll
 * - Active route highlighting (route-aware, not prop-driven)
 * - Mobile hamburger drawer (closes on link tap, traps focus minimally via ESC)
 *
 * `transparent` mode lets the landing hero sit underneath without a hard divider.
 */
export function SiteNav({ transparent = false }: { transparent?: boolean }) {
  const pathname = usePathname() ?? '/';
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const showSurface = scrolled || !transparent;

  const linkStyle = (active: boolean): React.CSSProperties => ({
    position: 'relative',
    fontSize: 14,
    fontWeight: 500,
    textDecoration: 'none',
    color: active ? 'var(--cv-primary)' : 'var(--cv-text-muted)',
    transition: 'color 0.2s',
    padding: '6px 12px',
    borderRadius: 'var(--cv-radius-sm)',
    fontFamily: 'var(--cv-font)',
  });

  return (
    <>
      <nav
        aria-label="Primary"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', height: 60,
          background: showSurface ? 'color-mix(in srgb, var(--cv-surface) 90%, transparent)' : 'transparent',
          backdropFilter: showSurface ? 'blur(12px) saturate(1.4)' : 'none',
          WebkitBackdropFilter: showSurface ? 'blur(12px) saturate(1.4)' : 'none',
          borderBottom: showSurface ? '1px solid var(--cv-border)' : '1px solid transparent',
          transition: 'background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease',
          fontFamily: 'var(--cv-font)',
        }}
      >
        <Link
          href="/"
          aria-label="CodeVision AI home"
          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
        >
          <CodeVisionLogo size={24} />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--cv-text)', letterSpacing: '-0.02em', fontFamily: 'var(--cv-font)' }}>
            CodeVision <span style={{ color: 'var(--cv-primary)' }}>AI</span>
          </span>
        </Link>

        {/* Desktop links */}
        <ul
          className="cv-nav-desktop"
          style={{
            display: 'flex', alignItems: 'center', gap: 2,
            listStyle: 'none', margin: 0, padding: 0,
          }}
        >
          {NAV_LINKS.map((l) => {
            const active = isActive(pathname, l);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? 'page' : undefined}
                  style={linkStyle(active)}
                >
                  {l.label}
                  {active && (
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute', left: 12, right: 12, bottom: -2,
                        height: 2, borderRadius: 2, background: 'var(--cv-primary)',
                      }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="cv-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ThemeToggleBtn />
          <Link
            href="/app?pick=1"
            className="cv-nav-cta"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 'var(--cv-radius)',
              background: 'var(--cv-primary)', color: 'var(--cv-primary-text)',
              fontWeight: 600, fontSize: 13, textDecoration: 'none',
              fontFamily: 'var(--cv-font)', transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--cv-primary-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--cv-primary)')}
          >
            Open Visualizer
          </Link>

          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="cv-mobile-menu"
            onClick={() => setMenuOpen((m) => !m)}
            className="cv-nav-burger"
            style={{
              display: 'none',
              width: 36, height: 36, borderRadius: 'var(--cv-radius)',
              border: '1px solid var(--cv-border)', background: 'var(--cv-surface)',
              color: 'var(--cv-text)', cursor: 'pointer',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {menuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          id="cv-mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          style={{
            position: 'fixed', inset: '60px 0 0 0', zIndex: 99,
            background: 'var(--cv-surface)',
            borderTop: '1px solid var(--cv-border)',
            padding: '16px 24px 24px',
            display: 'flex', flexDirection: 'column', gap: 4,
            fontFamily: 'var(--cv-font)',
          }}
        >
          {NAV_LINKS.map((l) => {
            const active = isActive(pathname, l);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'block', padding: '14px 12px',
                  borderRadius: 'var(--cv-radius)',
                  color: active ? 'var(--cv-primary)' : 'var(--cv-text)',
                  background: active ? 'var(--cv-primary-subtle)' : 'transparent',
                  textDecoration: 'none', fontWeight: 600, fontSize: 16,
                }}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/app?pick=1"
            style={{
              marginTop: 12,
              display: 'block', textAlign: 'center',
              padding: '14px 18px', borderRadius: 'var(--cv-radius)',
              background: 'var(--cv-primary)', color: 'var(--cv-primary-text)',
              textDecoration: 'none', fontWeight: 600, fontSize: 15,
            }}
          >
            Open Visualizer
          </Link>
        </div>
      )}

      {/* Responsive toggling — kept inline so the file is self-contained */}
      <style>{`
        @media (max-width: 820px) {
          .cv-nav-desktop { display: none !important; }
          .cv-nav-burger { display: inline-flex !important; }
          .cv-nav-cta { display: none !important; }
        }
      `}</style>
    </>
  );
}
