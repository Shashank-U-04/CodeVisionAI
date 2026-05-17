'use client';

import { use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/site/SiteShell';
import { PageHeader } from '@/components/site/PageHeader';
import { CodeBlock } from '@/components/site/CodeBlock';
import { DOCS, DOC_GROUPS, getDoc, type DocBlock } from '../_content';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function DocPage({ params }: PageProps) {
  const { slug } = use(params);
  const doc = getDoc(slug);
  if (!doc) notFound();

  return (
    <SiteShell>
      <PageHeader
        eyebrow={doc.group}
        title={doc.title}
        description={doc.summary}
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Docs', href: '/docs' },
          { label: doc.title },
        ]}
      />

      <div
        style={{
          maxWidth: 1100,
          width: '100%',
          margin: '0 auto',
          padding: '40px 24px 80px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 32,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: 48 }} className="cv-docs-grid">
          <aside
            aria-label="Docs sidebar"
            style={{
              alignSelf: 'start',
              position: 'sticky',
              top: 80,
              borderRight: '1px solid var(--cv-border)',
              paddingRight: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
            }}
          >
            {DOC_GROUPS.map((g) => {
              const items = DOCS.filter((d) => d.group === g);
              if (items.length === 0) return null;
              return (
                <div key={g}>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 700,
                      color: 'var(--cv-text-muted)',
                      marginBottom: 8,
                    }}
                  >
                    {g}
                  </div>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {items.map((d) => {
                      const active = d.slug === slug;
                      return (
                        <li key={d.slug}>
                          <Link
                            href={`/docs/${d.slug}`}
                            aria-current={active ? 'page' : undefined}
                            style={{
                              display: 'block',
                              padding: '6px 10px',
                              borderRadius: 'var(--cv-radius-sm)',
                              fontSize: 14,
                              color: active ? 'var(--cv-primary)' : 'var(--cv-text-secondary)',
                              background: active ? 'var(--cv-primary-subtle)' : 'transparent',
                              textDecoration: 'none',
                              fontWeight: active ? 600 : 500,
                            }}
                          >
                            {d.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </aside>

          <article style={{ minWidth: 0 }}>
            {doc.blocks.map((b, i) => (
              <DocBlockView key={i} block={b} />
            ))}
          </article>
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .cv-docs-grid { grid-template-columns: minmax(0, 1fr) !important; }
          .cv-docs-grid > aside { position: static !important; border-right: none !important; border-bottom: 1px solid var(--cv-border); padding: 0 0 16px !important; }
        }
      `}</style>
    </SiteShell>
  );
}

function DocBlockView({ block }: { block: DocBlock }) {
  switch (block.type) {
    case 'p':
      return (
        <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--cv-text-secondary)', margin: '0 0 16px' }}>
          {block.text}
        </p>
      );
    case 'h2':
      return (
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--cv-text)', margin: '32px 0 12px', letterSpacing: '-0.01em' }}>
          {block.text}
        </h2>
      );
    case 'h3':
      return (
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--cv-text)', margin: '24px 0 10px' }}>
          {block.text}
        </h3>
      );
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag style={{ margin: '0 0 18px', paddingLeft: 24, color: 'var(--cv-text-secondary)', fontSize: 16, lineHeight: 1.75 }}>
          {block.items.map((it, i) => <li key={i} style={{ marginBottom: 6 }}>{it}</li>)}
        </Tag>
      );
    }
    case 'code':
      return <CodeBlock code={block.code} language={block.language ?? 'python'} />;
    case 'kv':
      return (
        <div
          style={{
            margin: '12px 0 24px',
            borderRadius: 'var(--cv-radius-lg)',
            border: '1px solid var(--cv-border)',
            background: 'var(--cv-surface)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14.5 }}>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--cv-border)' }}>
                  <th
                    scope="row"
                    style={{
                      textAlign: 'left',
                      padding: '10px 14px',
                      fontFamily: 'var(--cv-font-mono)',
                      fontSize: 13,
                      color: 'var(--cv-text)',
                      width: '36%',
                      background: 'var(--cv-surface-deep)',
                      fontWeight: 600,
                    }}
                  >
                    {r.key}
                  </th>
                  <td style={{ padding: '10px 14px', color: 'var(--cv-text-secondary)' }}>
                    {r.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'callout': {
      const isWarn = block.tone === 'warning';
      return (
        <aside
          role="note"
          style={{
            margin: '20px 0',
            padding: '14px 16px',
            borderRadius: 'var(--cv-radius-lg)',
            borderLeft: `3px solid ${isWarn ? 'var(--cv-danger)' : 'var(--cv-primary)'}`,
            background: isWarn ? 'rgba(220,38,38,0.06)' : 'var(--cv-primary-subtle)',
            color: 'var(--cv-text-secondary)',
            fontSize: 15,
            lineHeight: 1.65,
          }}
        >
          {block.text}
        </aside>
      );
    }
  }
}
