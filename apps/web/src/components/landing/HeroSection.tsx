'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const HERO_CODE = `class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

pts = [Point(i, i*2) for i in range(3)]`;

function FadeIn({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay * 1000 + 50);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 0.6s ease, transform 0.6s ease`,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SyntaxSpan({ code }: { code: string }) {
  const keywords = ['class', 'def', 'return', 'for', 'in', 'if', 'elif', 'else', 'while', 'import', 'from', 'and', 'or', 'not', 'is', 'lambda', 'yield'];
  const builtins = ['print', 'range', 'len', 'int', 'str', 'list', 'dict', 'set', 'True', 'False', 'None'];

  const parts: { text: string; color: string }[] = [];
  let i = 0;
  while (i < code.length) {
    if (code[i] === '#') {
      parts.push({ text: code.slice(i), color: 'var(--cv-syn-comment)' });
      break;
    }
    if (code[i] === '"' || code[i] === "'") {
      const q = code[i]; let j = i + 1;
      while (j < code.length && code[j] !== q) { if (code[j] === '\\') j++; j++; }
      parts.push({ text: code.slice(i, j + 1), color: 'var(--cv-syn-string)' });
      i = j + 1; continue;
    }
    if (/[0-9]/.test(code[i]) && (i === 0 || /[^a-zA-Z_]/.test(code[i - 1]))) {
      let j = i; while (j < code.length && /[0-9.]/.test(code[j])) j++;
      parts.push({ text: code.slice(i, j), color: 'var(--cv-syn-number)' });
      i = j; continue;
    }
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i; while (j < code.length && /[a-zA-Z0-9_]/.test(code[j])) j++;
      const word = code.slice(i, j);
      if (word === 'self') parts.push({ text: word, color: 'var(--cv-syn-self)' });
      else if (keywords.includes(word)) parts.push({ text: word, color: 'var(--cv-syn-keyword)' });
      else if (builtins.includes(word)) parts.push({ text: word, color: 'var(--cv-syn-builtin)' });
      else parts.push({ text: word, color: 'var(--cv-text)' });
      i = j; continue;
    }
    parts.push({ text: code[i], color: 'var(--cv-text)' });
    i++;
  }
  return (
    <span>
      {parts.map((p, idx) => (
        <span key={idx} style={{ color: p.color }}>{p.text}</span>
      ))}
    </span>
  );
}

function HeroPreview() {
  const [typed, setTyped] = useState(0);
  const [showViz, setShowViz] = useState(false);
  const total = HERO_CODE.length;

  useEffect(() => {
    if (typed < total) {
      const speed = HERO_CODE[typed] === '\n' ? 80 : 15 + Math.random() * 20;
      const t = setTimeout(() => setTyped(c => c + 1), speed);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setShowViz(true), 400);
      return () => clearTimeout(t);
    }
  }, [typed, total]);

  const lines = HERO_CODE.slice(0, typed).split('\n');

  return (
    <div style={{
      maxWidth: 960, margin: '0 auto',
      borderRadius: 'var(--cv-radius-xl)',
      border: '1px solid var(--cv-border)',
      background: 'var(--cv-surface)',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.10), 0 0 0 1px var(--cv-border)',
      overflow: 'hidden',
    }}>
      {/* Window chrome */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px',
        background: 'var(--cv-surface-deep)',
        borderBottom: '1px solid var(--cv-border)',
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#FF5F57', '#FFBD2E', '#28C840'].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'var(--cv-text-faint)', fontFamily: 'var(--cv-font)' }}>
          CodeVision AI — Python Visualizer
        </div>
      </div>

      {/* Split pane */}
      <div style={{ display: 'flex', minHeight: 260 }}>
        {/* Editor */}
        <div style={{
          flex: '0 0 45%',
          borderRight: '1px solid var(--cv-border)',
          background: 'var(--cv-code-bg)',
          fontFamily: 'var(--cv-font-mono)', fontSize: 13, lineHeight: 1.8,
        }}>
          <div style={{
            padding: '4px 12px', fontSize: 11,
            color: 'var(--cv-text-faint)',
            borderBottom: '1px solid var(--cv-border)',
            background: 'var(--cv-surface)',
            fontFamily: 'var(--cv-font)',
            textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
          }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#FBBF24', marginRight: 6 }} />
            main.py
          </div>
          <div style={{ padding: '8px 0' }}>
            {lines.map((line, i) => (
              <div key={i} style={{
                display: 'flex', padding: '0 12px',
                background: i === lines.length - 1 && typed < total ? 'var(--cv-line-highlight)' : 'transparent',
              }}>
                <span style={{ width: 28, textAlign: 'right', paddingRight: 10, color: 'var(--cv-text-faint)', fontSize: 12, userSelect: 'none' }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1, whiteSpace: 'pre' }}>
                  <SyntaxSpan code={line} />
                  {i === lines.length - 1 && typed < total && (
                    <span className="cv-typing-cursor" />
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Viz pane */}
        <div style={{
          flex: 1, padding: 16,
          background: 'var(--cv-bg)',
          opacity: showViz ? 1 : 0.3,
          transition: 'opacity 0.5s ease',
        }}>
          {showViz ? <MiniViz /> : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cv-text-faint)', fontSize: 13, fontStyle: 'italic' }}>
              Waiting for execution...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniViz() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step < 3) {
      const t = setTimeout(() => setStep(s => s + 1), 600);
      return () => clearTimeout(t);
    }
  }, [step]);

  const frameStyle = (active: boolean): React.CSSProperties => ({
    borderRadius: 'var(--cv-radius)',
    border: active ? '1.5px solid var(--cv-active-border)' : '1px solid var(--cv-border)',
    background: active ? 'var(--cv-frame-active-bg)' : 'var(--cv-surface)',
    boxShadow: active ? '0 0 0 3px var(--cv-active-glow)' : 'none',
    overflow: 'hidden', marginBottom: 8,
    transition: 'all 0.3s ease',
  });

  const headerStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 10px', fontSize: 11,
    fontFamily: 'var(--cv-font-mono)', fontWeight: 700,
    background: active ? 'var(--cv-active-header-bg)' : 'var(--cv-frame-header-bg)',
    color: active ? 'var(--cv-active-header-fg)' : 'var(--cv-text)',
    borderBottom: '1px solid var(--cv-border)',
    display: 'flex', alignItems: 'center', gap: 6,
  });

  const varRow = (name: string, val: string, color: string) => (
    <div key={name} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '3px 10px', fontSize: 12, fontFamily: 'var(--cv-font-mono)',
      borderTop: '1px solid var(--cv-border)',
    }}>
      <span style={{ fontWeight: 600, color: 'var(--cv-text)' }}>{name}</span>
      <span style={{ fontWeight: 600, color }}>{val}</span>
    </div>
  );

  const heapObj = (label: string, color: string, children: React.ReactNode) => (
    <div style={{
      borderRadius: 'var(--cv-radius)', border: `1.5px solid ${color}`,
      background: `color-mix(in srgb, ${color} 5%, var(--cv-surface))`,
      overflow: 'hidden',
      animation: 'cv-fade-in-up 0.35s ease-out forwards',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '3px 8px', fontSize: 10, fontWeight: 600,
        fontFamily: 'var(--cv-font-mono)', color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        borderBottom: '1px solid var(--cv-border)',
      }}>
        {label}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <div style={{ flex: '0 0 42%' }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: 'var(--cv-text-muted)', marginBottom: 8 }}>
          Frames
        </div>
        <div style={frameStyle(step < 1)}>
          <div style={headerStyle(step < 1)}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: step < 1 ? 'var(--cv-active-border)' : 'var(--cv-text-faint)' }} />
            Global Frame
          </div>
          {varRow('Point', 'class', 'var(--cv-bool)')}
          {step >= 3 && varRow('pts', '→list', 'var(--cv-primary)')}
        </div>
        {step >= 1 && step < 3 && (
          <div style={frameStyle(true)}>
            <div style={headerStyle(true)}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--cv-active-border)' }} />
              &lt;listcomp&gt;()
            </div>
            {varRow('i', String(step - 1), 'var(--cv-int)')}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: 'var(--cv-text-muted)', marginBottom: 8 }}>
          Objects
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {step >= 1 && heapObj('list', 'var(--cv-heap-list)', (
            <div style={{ display: 'flex' }}>
              {[0, 1, 2].filter(n => n < step).map(n => (
                <div key={n} style={{ borderRight: n < step - 1 ? '1px solid var(--cv-border)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--cv-text-faint)', padding: '1px 8px', background: 'var(--cv-surface-deep)' }}>{n}</div>
                  <div style={{ padding: '3px 8px', fontSize: 11 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cv-primary)', display: 'inline-block' }} />
                  </div>
                </div>
              ))}
            </div>
          ))}
          {[0, 1, 2].filter(n => n < step).map(n => (
            <div key={n}>
              {heapObj('Point', 'var(--cv-heap-instance)', (
                <div>
                  {[['x', String(n)], ['y', String(n * 2)]].map(([k, v], ri) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px', fontSize: 11, fontFamily: 'var(--cv-font-mono)', borderTop: ri > 0 ? '1px solid var(--cv-border)' : 'none' }}>
                      <span style={{ fontWeight: 600, color: 'var(--cv-text)' }}>{k}</span>
                      <span style={{ fontWeight: 600, color: 'var(--cv-int)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section style={{
      position: 'relative', overflow: 'hidden',
      paddingTop: 120, paddingBottom: 80,
      background: 'var(--cv-bg)',
    }}>
      {/* Dot grid background */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.4,
        backgroundImage: 'radial-gradient(circle, var(--cv-border) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 32px', textAlign: 'center' }}>
        <FadeIn delay={0} style={{ marginBottom: 24 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 14px', borderRadius: 100,
            background: 'var(--cv-primary-light)', color: 'var(--cv-primary)',
            fontSize: 12, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase',
            fontFamily: 'var(--cv-font)',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Now in public beta
          </span>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 style={{
            fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 700,
            letterSpacing: '-0.03em', lineHeight: 1.1,
            maxWidth: 800, margin: '0 auto 20px',
            fontFamily: 'var(--cv-font)', color: 'var(--cv-text)',
          }}>
            See your code{' '}
            <span className="cv-gradient-text">think.</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p style={{
            fontSize: 'clamp(16px, 2vw, 19px)', color: 'var(--cv-text-muted)',
            maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.7,
            fontFamily: 'var(--cv-font)',
          }}>
            Step through Python execution line by line. Watch variables form, stacks grow, and heap objects link — all in real time.
          </p>
        </FadeIn>

        <FadeIn delay={0.3} style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 64 }}>
          <Link href="/app" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px', borderRadius: 'var(--cv-radius-lg)',
            background: 'var(--cv-primary)', color: 'var(--cv-primary-text)',
            fontWeight: 600, fontSize: 16, textDecoration: 'none',
            fontFamily: 'var(--cv-font)', transition: 'all 0.2s ease',
            boxShadow: 'var(--cv-shadow-md)',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv-primary-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--cv-primary)'; e.currentTarget.style.transform = 'none'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Try it Free
          </Link>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 28px', borderRadius: 'var(--cv-radius-lg)',
            background: 'transparent', color: 'var(--cv-text)',
            fontWeight: 600, fontSize: 16,
            border: '1.5px solid var(--cv-border)',
            fontFamily: 'var(--cv-font)', cursor: 'pointer', transition: 'all 0.2s ease',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cv-surface-deep)'; e.currentTarget.style.borderColor = 'var(--cv-border-strong)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--cv-border)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Watch Demo
          </button>
        </FadeIn>

        <FadeIn delay={0.4}>
          <HeroPreview />
        </FadeIn>
      </div>
    </section>
  );
}
