'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { SiteNav } from './SiteNav';
import { LandingFooter } from '@/components/landing/LandingFooter';

/**
 * SiteShell — common wrapper for all non-landing public routes
 * (/learn, /docs, /about, /changelog).
 *
 * Provides:
 *  - Theme sync between Zustand store and <html data-theme>
 *  - Top SiteNav (non-transparent — content sits below)
 *  - <main> landmark with safe top padding to clear the fixed nav
 *  - Shared footer
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div
      style={{
        background: 'var(--cv-bg)',
        color: 'var(--cv-text)',
        fontFamily: 'var(--cv-font)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <SiteNav />
      <main
        id="main"
        style={{
          flex: 1,
          paddingTop: 60, // height of fixed SiteNav
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
