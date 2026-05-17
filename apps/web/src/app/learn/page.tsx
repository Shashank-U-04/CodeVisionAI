'use client';

import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { PageHeader } from '@/components/site/PageHeader';
import { TUTORIALS } from './_content';

export default function LearnIndexPage() {
  return (
    <SiteShell>
      <PageHeader
        eyebrow="Learn"
        title="Tutorials that meet you halfway."
        description="Short, visual lessons that pair short explanations with code you can step through. Built for CS students, bootcamp learners, and the perpetually curious."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Learn' }]}
      />

      <section style={{ padding: '56px 24px 88px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 20,
            }}
          >
            {TUTORIALS.map((t) => {
              const ready = t.blocks !== null;
              return (
                <Link
                  key={t.slug}
                  href={`/learn/${t.slug}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 24,
                    borderRadius: 'var(--cv-radius-lg)',
                    border: '1px solid var(--cv-border)',
                    background: 'var(--cv-surface)',
                    color: 'inherit',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: 'var(--cv-shadow-sm)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--cv-primary)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--cv-shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--cv-border)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'var(--cv-shadow-sm)';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 12,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontWeight: 600,
                      color: 'var(--cv-text-muted)',
                    }}
                  >
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 100,
                        background: 'var(--cv-primary-subtle)',
                        color: 'var(--cv-primary)',
                      }}
                    >
                      {t.level}
                    </span>
                    <span>•</span>
                    <span>{t.topic}</span>
                  </div>

                  <h2
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      letterSpacing: '-0.01em',
                      color: 'var(--cv-text)',
                      margin: '0 0 10px',
                      lineHeight: 1.25,
                    }}
                  >
                    {t.title}
                  </h2>

                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: 'var(--cv-text-muted)',
                      margin: 0,
                      flex: 1,
                    }}
                  >
                    {t.summary}
                  </p>

                  <div
                    style={{
                      marginTop: 18,
                      paddingTop: 14,
                      borderTop: '1px solid var(--cv-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 12,
                      color: 'var(--cv-text-muted)',
                    }}
                  >
                    <span>{t.duration}</span>
                    <span style={{ color: ready ? 'var(--cv-primary)' : 'var(--cv-text-muted)', fontWeight: 600 }}>
                      {ready ? 'Read tutorial →' : 'Coming soon'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 56,
              padding: 32,
              borderRadius: 'var(--cv-radius-lg)',
              border: '1px dashed var(--cv-border-strong)',
              background: 'var(--cv-surface-deep)',
              textAlign: 'center',
            }}
          >
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--cv-text)',
                margin: '0 0 8px',
              }}
            >
              Want a topic covered?
            </h2>
            <p
              style={{
                color: 'var(--cv-text-muted)',
                margin: '0 0 16px',
                fontSize: 15,
              }}
            >
              Open an issue on GitHub and tell us what you wish you could see step by step.
            </p>
            <a
              href="https://github.com"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 'var(--cv-radius)',
                background: 'var(--cv-text)',
                color: 'var(--cv-bg)',
                fontWeight: 600,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Request a tutorial
            </a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
