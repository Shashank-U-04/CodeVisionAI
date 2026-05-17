'use client';

import { useState, useRef, useEffect } from 'react';

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fallback = setTimeout(() => setVisible(true), 800);
    let obs: IntersectionObserver | undefined;
    try {
      obs = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { setVisible(true); clearTimeout(fallback); obs?.disconnect(); }
      }, { threshold: 0.05, rootMargin: '50px' });
      obs.observe(el);
    } catch {}
    return () => { clearTimeout(fallback); obs?.disconnect(); };
  }, []);
  return { ref, visible };
}

export function FadeInSection({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const { ref, visible } = useFadeIn();
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 32, borderRadius: 'var(--cv-radius-lg)',
        border: '1px solid var(--cv-border)',
        background: hovered ? 'var(--cv-surface-deep)' : 'var(--cv-surface)',
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? 'var(--cv-shadow-md)' : 'none',
        cursor: 'default',
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 'var(--cv-radius)',
        background: 'var(--cv-primary-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em', fontFamily: 'var(--cv-font)', color: 'var(--cv-text)' }}>
        {title}
      </h3>
      <p style={{ fontSize: 15, color: 'var(--cv-text-muted)', lineHeight: 1.65, fontFamily: 'var(--cv-font)' }}>
        {desc}
      </p>
    </div>
  );
}

export function FeaturesSection() {
  const features = [
    {
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cv-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>,
      title: 'Step-by-step execution',
      desc: 'Move forward and backward through every line of your code. See exactly what happens at each step.',
    },
    {
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cv-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 17h7M17.5 14v7" /></svg>,
      title: 'Live heap & stack visualization',
      desc: 'Watch variables form in stack frames. See heap objects — lists, dicts, instances — with arrows showing references.',
    },
    {
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cv-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M2 19.5c0-3.59 4.03-6.5 10-6.5s10 2.91 10 6.5" /><circle cx="18" cy="8" r="3" fill="none" /><path d="M18 6v4M16 8h4" /></svg>,
      title: 'AI explanations',
      desc: "Get plain-English explanations of what's happening at each step. Perfect for understanding recursion, OOP, and more.",
    },
    {
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cv-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>,
      title: 'Multi-language support',
      desc: 'Visualize Python fully, with C, C++, and Java editor support. Choose your language before diving in.',
    },
  ];

  return (
    <section id="features" style={{ padding: '80px 32px', background: 'var(--cv-surface)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <FadeInSection>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12, fontFamily: 'var(--cv-font)', color: 'var(--cv-text)' }}>
              Everything you need to understand code
            </h2>
            <p style={{ fontSize: 17, color: 'var(--cv-text-muted)', maxWidth: 520, margin: '0 auto', fontFamily: 'var(--cv-font)' }}>
              Built for learners, loved by educators. Visualize Python, C, C++, and Java execution like never before.
            </p>
          </div>
        </FadeInSection>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          {features.map((f, i) => (
            <FadeInSection key={i} delay={i * 0.1}>
              <FeatureCard {...f} />
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}
