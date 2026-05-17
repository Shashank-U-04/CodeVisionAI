'use client';

import { use } from 'react';
import { useRouter, notFound } from 'next/navigation';
import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { PageHeader } from '@/components/site/PageHeader';
import { CodeBlock } from '@/components/site/CodeBlock';
import { getTutorial, TUTORIALS, type TutorialBlock } from '../_content';
import { useLanguageStore } from '@/stores/languageStore';
import { useCodeStore } from '@/stores/codeStore';

interface PageProps {
  // Next.js 16 — params is a Promise that must be unwrapped
  params: Promise<{ slug: string }>;
}

export default function TutorialPage({ params }: PageProps) {
  const { slug } = use(params);
  const tutorial = getTutorial(slug);

  if (!tutorial) notFound();

  if (tutorial.blocks === null) {
    return (
      <SiteShell>
        <PageHeader
          eyebrow={tutorial.topic}
          title={tutorial.title}
          description={tutorial.summary}
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Learn', href: '/learn' },
            { label: tutorial.title },
          ]}
        />
        <section style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div
            style={{
              maxWidth: 560,
              margin: '0 auto',
              padding: 32,
              borderRadius: 'var(--cv-radius-lg)',
              border: '1px dashed var(--cv-border-strong)',
              background: 'var(--cv-surface)',
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--cv-text)' }}>
              This tutorial is being written.
            </h2>
            <p style={{ color: 'var(--cv-text-muted)', margin: '0 0 20px', fontSize: 15 }}>
              We&apos;re still polishing the draft. In the meantime, try the visualizer or read one of the published lessons.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/learn"
                style={{
                  padding: '10px 18px', borderRadius: 'var(--cv-radius)',
                  border: '1px solid var(--cv-border)', color: 'var(--cv-text)',
                  textDecoration: 'none', fontWeight: 600, fontSize: 14,
                }}
              >
                Back to tutorials
              </Link>
              <Link
                href="/app"
                style={{
                  padding: '10px 18px', borderRadius: 'var(--cv-radius)',
                  background: 'var(--cv-primary)', color: 'var(--cv-primary-text)',
                  textDecoration: 'none', fontWeight: 600, fontSize: 14,
                }}
              >
                Open the visualizer
              </Link>
            </div>
          </div>
        </section>
      </SiteShell>
    );
  }

  // Find adjacent tutorials for prev/next nav (only ready ones)
  const readyList = TUTORIALS.filter((t) => t.blocks !== null);
  const idx = readyList.findIndex((t) => t.slug === slug);
  const prev = idx > 0 ? readyList[idx - 1] : null;
  const next = idx >= 0 && idx < readyList.length - 1 ? readyList[idx + 1] : null;

  return (
    <SiteShell>
      <PageHeader
        eyebrow={`${tutorial.level} • ${tutorial.duration}`}
        title={tutorial.title}
        description={tutorial.summary}
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Learn', href: '/learn' },
          { label: tutorial.title },
        ]}
      />

      <article
        style={{
          padding: '48px 24px 32px',
          maxWidth: 820,
          margin: '0 auto',
          width: '100%',
          color: 'var(--cv-text)',
        }}
      >
        {tutorial.blocks.map((b, i) => (
          <TutorialBlockView key={i} block={b} />
        ))}
      </article>

      {/* Prev / Next */}
      {(prev || next) && (
        <nav
          aria-label="Tutorial navigation"
          style={{
            maxWidth: 820,
            width: '100%',
            margin: '0 auto',
            padding: '24px 24px 80px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          {prev ? (
            <Link href={`/learn/${prev.slug}`} style={navCardStyle}>
              <span style={navHintStyle}>← Previous</span>
              <span style={navTitleStyle}>{prev.title}</span>
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/learn/${next.slug}`} style={{ ...navCardStyle, textAlign: 'right' }}>
              <span style={navHintStyle}>Next →</span>
              <span style={navTitleStyle}>{next.title}</span>
            </Link>
          ) : <span />}
        </nav>
      )}
    </SiteShell>
  );
}

const navCardStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4,
  padding: 16, borderRadius: 'var(--cv-radius-lg)',
  border: '1px solid var(--cv-border)', background: 'var(--cv-surface)',
  textDecoration: 'none', color: 'var(--cv-text)',
};
const navHintStyle: React.CSSProperties = {
  fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
  fontWeight: 600, color: 'var(--cv-text-muted)',
};
const navTitleStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 600, color: 'var(--cv-text)',
};

function TutorialBlockView({ block }: { block: TutorialBlock }) {
  if (block.type === 'section') {
    return (
      <section style={{ marginBottom: 28 }}>
        {block.heading && (
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: 'var(--cv-text)',
              margin: '32px 0 14px',
            }}
          >
            {block.heading}
          </h2>
        )}
        {block.body?.map((p, i) => (
          <p
            key={i}
            style={{
              fontSize: 16,
              lineHeight: 1.75,
              color: 'var(--cv-text-secondary)',
              margin: '0 0 16px',
            }}
          >
            {p}
          </p>
        ))}
      </section>
    );
  }

  if (block.type === 'code' && block.code) {
    return <CodeBlock code={block.code.code} language={block.code.language} />;
  }

  if (block.type === 'callout') {
    const isWarn = block.tone === 'warning';
    return (
      <aside
        role="note"
        style={{
          margin: '24px 0',
          padding: '16px 18px',
          borderRadius: 'var(--cv-radius-lg)',
          borderLeft: `3px solid ${isWarn ? 'var(--cv-danger)' : 'var(--cv-primary)'}`,
          background: isWarn ? 'rgba(220,38,38,0.06)' : 'var(--cv-primary-subtle)',
          color: 'var(--cv-text-secondary)',
          fontSize: 15,
          lineHeight: 1.65,
        }}
      >
        <strong style={{ display: 'block', marginBottom: 4, color: 'var(--cv-text)' }}>
          {isWarn ? 'Watch out' : 'Heads up'}
        </strong>
        {block.text}
      </aside>
    );
  }

  if (block.type === 'try' && block.prefillCode) {
    return <TryItButton code={block.prefillCode} label={block.ctaLabel ?? 'Open in visualizer'} />;
  }

  return null;
}

function TryItButton({ code, label }: { code: string; label: string }) {
  const router = useRouter();
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const setCodeForLang = useCodeStore((s) => s.setCode);

  const handleClick = () => {
    // Tutorials are Python-only today; prefill Python's draft and navigate.
    setLanguage('python');
    setCodeForLang('python', code);
    try {
      sessionStorage.setItem('codevision:prefill', code);
    } catch { /* ignore */ }
    router.push('/app');
  };

  return (
    <div style={{ margin: '24px 0' }}>
      <button
        type="button"
        onClick={handleClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 22px',
          borderRadius: 'var(--cv-radius)',
          background: 'var(--cv-primary)',
          color: 'var(--cv-primary-text)',
          border: 'none',
          fontWeight: 600,
          fontSize: 15,
          cursor: 'pointer',
          fontFamily: 'var(--cv-font)',
          boxShadow: 'var(--cv-shadow-md)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        {label}
      </button>
    </div>
  );
}
