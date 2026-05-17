'use client';

import { SiteShell } from '@/components/site/SiteShell';
import { PageHeader } from '@/components/site/PageHeader';

interface Release {
  version: string;
  date: string; // human readable
  tag: 'launch' | 'feature' | 'fix' | 'docs';
  title: string;
  notes: string[];
}

const RELEASES: Release[] = [
  {
    version: 'v0.1.0',
    date: 'May 2026',
    tag: 'launch',
    title: 'Initial launch',
    notes: [
      'In-browser Python visualizer powered by Pyodide — no install, no server.',
      'Step forward and backward through execution with arrow keys; scrubbable timeline at the bottom.',
      'Live frame and heap rendering with arrows linking references, Python Tutor-style.',
      'Interactive input() support via an xterm.js console.',
      'Editor-only support for C, C++, and Java (full visualization for these is in progress).',
      'Light and dark themes, keyboard-first navigation, mobile-friendly layout.',
      'New site structure: tutorials at /learn, documentation at /docs, project info at /about.',
    ],
  },
];

const TAG_STYLES: Record<Release['tag'], { bg: string; fg: string; label: string }> = {
  launch: { bg: 'var(--cv-primary-light)', fg: 'var(--cv-primary)', label: 'Launch' },
  feature: { bg: 'var(--cv-secondary-light)', fg: 'var(--cv-secondary)', label: 'Feature' },
  fix: { bg: 'rgba(220,38,38,0.10)', fg: 'var(--cv-danger)', label: 'Fix' },
  docs: { bg: 'var(--cv-surface-deep)', fg: 'var(--cv-text-secondary)', label: 'Docs' },
};

export default function ChangelogPage() {
  return (
    <SiteShell>
      <PageHeader
        eyebrow="Changelog"
        title="What we shipped, and when."
        description="A running log of every release. We move in small, visible steps."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Changelog' }]}
      />

      <section style={{ padding: '56px 24px 88px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {RELEASES.map((r) => {
            const tag = TAG_STYLES[r.tag];
            return (
              <article
                key={r.version}
                style={{
                  position: 'relative',
                  padding: '24px 0 32px',
                  borderBottom: '1px solid var(--cv-border)',
                }}
              >
                <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: 'var(--cv-font-mono)',
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--cv-text)',
                      padding: '4px 10px',
                      borderRadius: 'var(--cv-radius-sm)',
                      background: 'var(--cv-surface-deep)',
                      border: '1px solid var(--cv-border)',
                    }}
                  >
                    {r.version}
                  </span>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 100,
                      background: tag.bg,
                      color: tag.fg,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {tag.label}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--cv-text-muted)' }}>{r.date}</span>
                </header>

                <h2
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--cv-text)',
                    margin: '0 0 14px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {r.title}
                </h2>

                <ul style={{ margin: 0, paddingLeft: 22, fontSize: 15.5, lineHeight: 1.7, color: 'var(--cv-text-secondary)' }}>
                  {r.notes.map((n, i) => <li key={i} style={{ marginBottom: 6 }}>{n}</li>)}
                </ul>
              </article>
            );
          })}

          <div
            style={{
              marginTop: 32,
              padding: 24,
              borderRadius: 'var(--cv-radius-lg)',
              border: '1px dashed var(--cv-border-strong)',
              background: 'var(--cv-surface-deep)',
              textAlign: 'center',
              fontSize: 14,
              color: 'var(--cv-text-muted)',
            }}
          >
            That&apos;s the whole list. New releases land here as we ship.
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
