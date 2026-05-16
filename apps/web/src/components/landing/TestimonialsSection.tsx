'use client';

import { FadeInSection } from './FeaturesSection';

function TestimonialCard({ quote, name, role, initials, color }: { quote: string; name: string; role: string; initials: string; color: string }) {
  return (
    <div style={{
      padding: 28, borderRadius: 'var(--cv-radius-lg)',
      border: '1px solid var(--cv-border)',
      background: 'var(--cv-surface)',
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" fill={color} opacity="0.2" />
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" fill={color} opacity="0.2" />
      </svg>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--cv-text-secondary)', flex: 1, fontFamily: 'var(--cv-font)' }}>{quote}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: color, color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, fontFamily: 'var(--cv-font)',
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cv-text)', fontFamily: 'var(--cv-font)' }}>{name}</div>
          <div style={{ fontSize: 13, color: 'var(--cv-text-muted)', fontFamily: 'var(--cv-font)' }}>{role}</div>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  const testimonials = [
    { quote: 'CodeVision completely changed how I teach data structures. Students can finally see what a linked list looks like in memory.', name: 'Dr. Sarah Chen', role: 'CS Professor, Stanford', initials: 'SC', color: 'var(--cv-primary)' },
    { quote: 'I used to stare at recursive code for hours. Now I step through it and watch the stack frames build up. Total game changer.', name: 'Marcus Johnson', role: 'Bootcamp Student', initials: 'MJ', color: 'var(--cv-secondary)' },
    { quote: 'The heap visualization is brilliant. Seeing references as arrows finally made pointers click for me.', name: 'Priya Sharma', role: 'Self-taught Developer', initials: 'PS', color: '#A855F7' },
  ];

  return (
    <section style={{ padding: '80px 32px', background: 'var(--cv-surface)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeInSection>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 10px', borderRadius: 100,
              background: 'var(--cv-primary-light)', color: 'var(--cv-primary)',
              fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase',
              marginBottom: 16, fontFamily: 'var(--cv-font)',
            }}>Testimonials</span>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'var(--cv-font)', color: 'var(--cv-text)' }}>
              Loved by learners and educators
            </h2>
          </div>
        </FadeInSection>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {testimonials.map((t, i) => (
            <FadeInSection key={i} delay={i * 0.1}>
              <TestimonialCard {...t} />
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}
