'use client';

import Link from 'next/link';
import { FadeInSection } from './FeaturesSection';

export function CTASection() {
  return (
    <section style={{ padding: '80px 32px', background: 'var(--cv-bg)' }}>
      <FadeInSection>
        <div style={{
          maxWidth: 800, margin: '0 auto', textAlign: 'center',
          padding: '56px 48px', borderRadius: 'var(--cv-radius-xl)',
          border: '1px solid var(--cv-border)',
          background: `linear-gradient(135deg, var(--cv-primary-subtle) 0%, var(--cv-surface) 50%, color-mix(in srgb, var(--cv-secondary) 5%, var(--cv-surface)) 100%)`,
        }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12, fontFamily: 'var(--cv-font)', color: 'var(--cv-text)' }}>
            Ready to see your code think?
          </h2>
          <p style={{ fontSize: 17, color: 'var(--cv-text-muted)', marginBottom: 28, maxWidth: 440, margin: '0 auto 28px', fontFamily: 'var(--cv-font)' }}>
            Start visualizing Python execution in seconds. No install, no signup required.
          </p>
          <Link href="/app" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px', borderRadius: 'var(--cv-radius-lg)',
            background: 'var(--cv-primary)', color: 'var(--cv-primary-text)',
            fontWeight: 600, fontSize: 16, textDecoration: 'none',
            fontFamily: 'var(--cv-font)', transition: 'all 0.2s ease',
            boxShadow: 'var(--cv-shadow-md)',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv-primary-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--cv-primary)'; e.currentTarget.style.transform = 'none'; }}
          >
            Launch Visualizer
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </FadeInSection>
    </section>
  );
}
