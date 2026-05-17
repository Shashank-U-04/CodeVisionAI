'use client';

import Link from 'next/link';
import { SiteShell } from '@/components/site/SiteShell';
import { PageHeader } from '@/components/site/PageHeader';

export default function AboutPage() {
  return (
    <SiteShell>
      <PageHeader
        eyebrow="About"
        title="Code is a story. CodeVision is how you read it."
        description="An education-first execution visualizer for people who learn by seeing. Built by engineers who remember being beginners."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'About' }]}
      />

      <section style={{ padding: '56px 24px', maxWidth: 820, margin: '0 auto', width: '100%' }}>
        <h2 style={sectionHeading}>Why we built this</h2>
        <p style={para}>
          Most people learn to code by reading static text and running programs they cannot see inside.
          When something breaks, the only feedback they get is a stack trace — which is the runtime
          screaming at them in a language they have not learned yet.
        </p>
        <p style={para}>
          CodeVision exists to make execution visible. Every variable, every reference, every step of
          the call stack is drawn in real time. The goal is not to teach you a tool; it is to make the
          mental model of how programs run feel obvious.
        </p>

        <h2 style={sectionHeading}>Who it is for</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, margin: '14px 0 28px' }}>
          {AUDIENCES.map((a) => (
            <div
              key={a.title}
              style={{
                padding: 18,
                borderRadius: 'var(--cv-radius-lg)',
                border: '1px solid var(--cv-border)',
                background: 'var(--cv-surface)',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--cv-text)', marginBottom: 6 }}>{a.title}</div>
              <div style={{ fontSize: 14, color: 'var(--cv-text-muted)', lineHeight: 1.55 }}>{a.body}</div>
            </div>
          ))}
        </div>

        <h2 style={sectionHeading}>How we are different</h2>
        <p style={para}>
          Python Tutor — the project that pioneered this style of visualization — has helped millions
          of students. CodeVision is built in its spirit and aims to push the same idea forward with
          modern web technology.
        </p>
        <ul style={listStyle}>
          <li style={listItem}>
            <strong>Runs entirely in your browser.</strong> Pyodide compiles Python to WebAssembly, so
            there is no server round-trip per step. The whole tool works offline once loaded.
          </li>
          <li style={listItem}>
            <strong>Built for modern screens.</strong> Real dark mode, scrubbable timeline, responsive
            layout, animated transitions, keyboard navigation.
          </li>
          <li style={listItem}>
            <strong>Multi-language from day one.</strong> Python ships today; C, C++, and Java editors
            are live with visualization rolling out next.
          </li>
          <li style={listItem}>
            <strong>Designed for classrooms.</strong> No accounts, no telemetry on code, no signup
            walls between you and a working tool. Send a link, get to work.
          </li>
        </ul>

        <h2 style={sectionHeading}>What is next</h2>
        <p style={para}>
          We are focused on landing the C visualizer (explicit pointers make a fantastic visual story),
          adding shareable trace permalinks, and partnering with a few CS courses to make sure the
          tool matches how educators actually want to teach. Got ideas? Open an issue.
        </p>

        <div
          style={{
            marginTop: 40,
            padding: 24,
            borderRadius: 'var(--cv-radius-lg)',
            background: 'var(--cv-primary-subtle)',
            border: '1px solid var(--cv-border)',
            textAlign: 'center',
          }}
        >
          <h2 style={{ ...sectionHeading, marginTop: 0 }}>Try it</h2>
          <p style={{ ...para, color: 'var(--cv-text-secondary)' }}>
            The fastest way to understand what CodeVision does is to step through some code.
          </p>
          <Link
            href="/app?pick=1"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 22px',
              marginTop: 6,
              borderRadius: 'var(--cv-radius)',
              background: 'var(--cv-primary)',
              color: 'var(--cv-primary-text)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Open the visualizer
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}

const AUDIENCES = [
  {
    title: 'CS students',
    body: 'See data structures, recursion, and OOP behave the way the textbook claims they do. Match diagrams to running code.',
  },
  {
    title: 'Bootcamp learners',
    body: 'Build the mental model behind "what does this code actually do?" before you have to debug it under pressure.',
  },
  {
    title: 'Educators',
    body: 'Project execution in real time. Replace whiteboard hand-waving with a tool students can drive themselves at home.',
  },
  {
    title: 'Curious engineers',
    body: 'Sanity-check intuitions about reference semantics, list aliasing, or how a generator suspends — visually.',
  },
];

const sectionHeading: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  color: 'var(--cv-text)',
  margin: '32px 0 14px',
  letterSpacing: '-0.01em',
};

const para: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.75,
  color: 'var(--cv-text-secondary)',
  margin: '0 0 16px',
};

const listStyle: React.CSSProperties = {
  margin: '0 0 24px',
  paddingLeft: 22,
  color: 'var(--cv-text-secondary)',
  fontSize: 16,
  lineHeight: 1.75,
};

const listItem: React.CSSProperties = {
  marginBottom: 10,
};
