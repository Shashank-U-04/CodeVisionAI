'use client';

import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { PageHeader } from '@/components/site/PageHeader';
import { DOCS, DOC_GROUPS } from './_content';

export default function DocsIndexPage() {
  return (
    <SiteShell>
      <PageHeader
        eyebrow="Docs"
        title="Everything you need to use (and extend) CodeVision."
        description="Practical guides for users, reference material for power users, and architecture notes for contributors."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Docs' }]}
      />

      <section style={{ padding: '56px 24px 88px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>
          {DOC_GROUPS.map((group) => {
            const items = DOCS.filter((d) => d.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <h2
                  style={{
                    fontSize: 13,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: 700,
                    color: 'var(--cv-text-muted)',
                    margin: '0 0 16px',
                  }}
                >
                  {group}
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 14,
                  }}
                >
                  {items.map((d) => (
                    <Link
                      key={d.slug}
                      href={`/docs/${d.slug}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: 20,
                        borderRadius: 'var(--cv-radius-lg)',
                        border: '1px solid var(--cv-border)',
                        background: 'var(--cv-surface)',
                        color: 'var(--cv-text)',
                        textDecoration: 'none',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--cv-primary)';
                        e.currentTarget.style.background = 'var(--cv-primary-subtle)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--cv-border)';
                        e.currentTarget.style.background = 'var(--cv-surface)';
                      }}
                    >
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: 'var(--cv-text)',
                          marginBottom: 6,
                        }}
                      >
                        {d.title}
                      </span>
                      <span
                        style={{
                          fontSize: 13.5,
                          color: 'var(--cv-text-muted)',
                          lineHeight: 1.55,
                        }}
                      >
                        {d.summary}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}
