'use client';

import { FadeInSection } from './FeaturesSection';

export function HowItWorksSection() {
  const steps = [
    { num: '01', title: 'Write Python', desc: 'Use the built-in editor with syntax highlighting. Paste your own code or pick from examples.', color: 'var(--cv-primary)' },
    { num: '02', title: 'Run & Step', desc: 'Execute your code in the browser with Pyodide. Step forward and backward through every line.', color: 'var(--cv-secondary)' },
    { num: '03', title: 'Understand', desc: 'See the call stack, heap objects, and references update in real time. Variables come alive.', color: '#A855F7' },
  ];

  return (
    <section style={{ padding: '80px 32px', background: 'var(--cv-bg)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeInSection>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 10px', borderRadius: 100,
              background: 'var(--cv-secondary-light)', color: 'var(--cv-secondary)',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase',
              marginBottom: 16, fontFamily: 'var(--cv-font)',
            }}>
              How it works
            </span>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'var(--cv-font)', color: 'var(--cv-text)' }}>
              Three steps to clarity
            </h2>
          </div>
        </FadeInSection>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 44, left: '20%', right: '20%', height: 2,
            background: 'linear-gradient(to right, var(--cv-primary), var(--cv-secondary), #A855F7)',
            opacity: 0.2, borderRadius: 1,
          }} />
          {steps.map((s, i) => (
            <FadeInSection key={i} delay={i * 0.15}>
              <div style={{ textAlign: 'center', position: 'relative' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: s.color, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 700, fontFamily: 'var(--cv-font-mono)',
                  margin: '0 auto 20px',
                  boxShadow: `0 0 0 4px var(--cv-bg), 0 0 0 6px ${s.color}33`,
                }}>
                  {s.num}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, fontFamily: 'var(--cv-font)', color: 'var(--cv-text)' }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: 15, color: 'var(--cv-text-muted)', lineHeight: 1.65, maxWidth: 300, margin: '0 auto', fontFamily: 'var(--cv-font)' }}>
                  {s.desc}
                </p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}
