'use client';

import Link from 'next/link';

interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  crumbs?: Crumb[];
  children?: React.ReactNode;
}

/**
 * PageHeader — shared header used by all sub-pages
 * (Learn, Docs, About, Changelog).
 *
 * Renders the single <h1> for the page, breadcrumbs, and an optional eyebrow tag.
 * Pages should NOT render another <h1>; use <h2> for section headings.
 */
export function PageHeader({ eyebrow, title, description, crumbs, children }: Props) {
  return (
    <header
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '64px 24px 48px',
        borderBottom: '1px solid var(--cv-border)',
        background:
          'linear-gradient(180deg, var(--cv-primary-subtle) 0%, transparent 100%)',
      }}
    >
      {/* faint dot grid */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.35,
          backgroundImage:
            'radial-gradient(circle, var(--cv-border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage:
            'radial-gradient(ellipse 70% 70% at 50% 30%, black 30%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 70% at 50% 30%, black 30%, transparent 80%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        {crumbs && crumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: 'var(--cv-text-muted)',
              marginBottom: 18,
              flexWrap: 'wrap',
            }}
          >
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <span
                  key={i}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {c.href && !last ? (
                    <Link
                      href={c.href}
                      style={{
                        color: 'var(--cv-text-muted)',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={last ? 'page' : undefined}
                      style={{
                        color: last ? 'var(--cv-text)' : 'var(--cv-text-muted)',
                        fontWeight: last ? 600 : 500,
                      }}
                    >
                      {c.label}
                    </span>
                  )}
                  {!last && (
                    <span aria-hidden="true" style={{ opacity: 0.5 }}>
                      ›
                    </span>
                  )}
                </span>
              );
            })}
          </nav>
        )}

        {eyebrow && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 100,
              background: 'var(--cv-primary-light)',
              color: 'var(--cv-primary)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            {eyebrow}
          </span>
        )}

        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            margin: 0,
            color: 'var(--cv-text)',
          }}
        >
          {title}
        </h1>

        {description && (
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: 'var(--cv-text-muted)',
              maxWidth: 720,
              marginTop: 18,
              marginBottom: 0,
            }}
          >
            {description}
          </p>
        )}

        {children && <div style={{ marginTop: 24 }}>{children}</div>}
      </div>
    </header>
  );
}
