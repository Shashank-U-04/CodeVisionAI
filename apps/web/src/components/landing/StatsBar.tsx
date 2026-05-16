'use client';

import { FadeInSection } from './FeaturesSection';

export function StatsBar() {
  const stats = [
    { value: '10,000+', label: 'Learners worldwide' },
    { value: '250+', label: 'Universities' },
    { value: '50,000+', label: 'Visualizations run' },
    { value: '4.9/5', label: 'User rating' },
  ];

  return (
    <section style={{ padding: '40px 32px', background: 'var(--cv-primary)', color: 'white' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
        {stats.map((s, i) => (
          <FadeInSection key={i} delay={i * 0.1}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'var(--cv-font)' }}>{s.value}</div>
              <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4, fontFamily: 'var(--cv-font)' }}>{s.label}</div>
            </div>
          </FadeInSection>
        ))}
      </div>
    </section>
  );
}
