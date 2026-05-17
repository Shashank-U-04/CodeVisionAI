'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useLanguageStore,
  LANGUAGE_CONFIG,
  type Language,
} from '@/stores/languageStore';
import { useExecutionStore } from '@/stores/executionStore';

function LanguageIcon({ lang }: { lang: Language }) {
  if (lang === 'python') {
    return (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path
          d="M24 6C19.5 6 16 7.5 16 10V14H24V15H12C9.8 15 8 17.2 8 20V28C8 30.8 9.8 33 12 33H15V29C15 26.8 16.8 25 19 25H29C31.2 25 33 23.2 33 21V11C33 8.8 31.2 6 29 6H24Z"
          fill="#3776AB"
        />
        <path
          d="M24 42C28.5 42 32 40.5 32 38V34H24V33H36C38.2 33 40 30.8 40 28V20C40 17.2 38.2 15 36 15H33V19C33 21.2 31.2 23 29 23H19C16.8 23 15 24.8 15 27V37C15 39.2 16.8 42 19 42H24Z"
          fill="#FFD343"
        />
        <circle cx="20.5" cy="11.5" r="1.5" fill="white" />
        <circle cx="27.5" cy="36.5" r="1.5" fill="white" />
      </svg>
    );
  }
  if (lang === 'c') {
    return (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="4" y="4" width="40" height="40" rx="8" fill="#5C6BC0" />
        <text
          x="24"
          y="32"
          textAnchor="middle"
          fill="white"
          fontSize="22"
          fontWeight="800"
          fontFamily="monospace"
        >
          C
        </text>
      </svg>
    );
  }
  if (lang === 'cpp') {
    return (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="4" y="4" width="40" height="40" rx="8" fill="#00599C" />
        <text
          x="20"
          y="32"
          textAnchor="middle"
          fill="white"
          fontSize="18"
          fontWeight="800"
          fontFamily="monospace"
        >
          C++
        </text>
      </svg>
    );
  }
  // java
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path
        d="M20 8C20 8 18 14 22 17C26 20 22 22 22 22C22 22 28 20 25 15C22 10 20 8 20 8Z"
        fill="#F89820"
      />
      <path
        d="M17 22C17 22 14 24 16 26C18 28 26 28 26 28C26 28 31 27 29 25C27 23 17 22 17 22Z"
        fill="#EA6F0C"
      />
      <path
        d="M18 30C18 30 15 32 17 34C19 36 26 36 28 35C30 34 29 32 29 32C29 32 24 33 20 32C16 31 18 30 18 30Z"
        fill="#EA6F0C"
      />
      <path
        d="M31 27C31 27 33 28 31 30C31 30 35 29 33 27C31 25 31 27 31 27Z"
        fill="#EA6F0C"
      />
      <path
        d="M19 37C19 37 16 38 18 40C20 42 28 42 31 40C34 38 32 37 32 37C32 37 26 38 22 38C18 38 19 37 19 37Z"
        fill="#5382A1"
      />
    </svg>
  );
}

function LanguageCard({
  lang,
  onSelect,
}: {
  lang: Language;
  onSelect: (l: Language) => void;
}) {
  const config = LANGUAGE_CONFIG[lang];
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={() => onSelect(lang)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '28px 28px',
        borderRadius: '16px',
        border: hovered ? `1.5px solid ${config.color}` : '1.5px solid var(--cv-border)',
        background: hovered ? config.bgGradient : 'var(--cv-panel)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered
          ? `0 16px 40px -12px ${config.color}40, 0 0 0 1px ${config.color}20`
          : '0 2px 8px rgba(0,0,0,0.06)',
        width: '100%',
        outline: 'none',
      }}
    >
      {/* Badge */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: '3px 10px',
          borderRadius: '100px',
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'var(--cv-font)',
          letterSpacing: '0.03em',
          background: config.isVisualizationSupported
            ? 'rgba(22,163,74,0.12)'
            : 'var(--cv-panel-deep)',
          color: config.isVisualizationSupported ? '#16a34a' : 'var(--cv-muted)',
          border: config.isVisualizationSupported
            ? '1px solid rgba(22,163,74,0.25)'
            : '1px solid var(--cv-border)',
        }}
      >
        {config.isVisualizationSupported ? '✓ ' : ''}
        {config.badge}
      </div>

      {/* Icon */}
      <div style={{ marginBottom: 20 }}>
        <LanguageIcon lang={lang} />
      </div>

      {/* Name */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: 'var(--cv-text)',
          fontFamily: 'var(--cv-font)',
          letterSpacing: '-0.02em',
          marginBottom: 6,
          transition: 'color 0.2s',
        }}
      >
        {config.label}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 14,
          color: 'var(--cv-muted)',
          fontFamily: 'var(--cv-font)',
          lineHeight: 1.5,
          marginBottom: 8,
        }}
      >
        {config.description}
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 12,
          color: hovered ? config.color : 'var(--cv-muted)',
          fontFamily: 'var(--cv-font)',
          fontWeight: 500,
          transition: 'color 0.2s',
        }}
      >
        {config.tagline}
      </div>

      {/* Bottom arrow indicator */}
      <div
        style={{
          marginTop: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'var(--cv-font)',
          color: hovered ? config.color : 'var(--cv-muted)',
          transition: 'color 0.2s',
        }}
      >
        Start coding
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </div>
    </button>
  );
}

export function LanguageSelectScreen() {
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const reset = useExecutionStore((s) => s.reset);
  const [entering, setEntering] = useState(false);

  const handleSelect = (lang: Language) => {
    setEntering(true);
    reset();
    // Per-language drafts live in codeStore; no need to seed code here.
    setTimeout(() => {
      setLanguage(lang);
    }, 350);
  };

  const langs: Language[] = ['python', 'c', 'cpp', 'java'];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--cv-bg)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        opacity: entering ? 0 : 1,
        transform: entering ? 'scale(0.98)' : 'scale(1)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}
    >
      {/* Dot grid background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.4,
          backgroundImage:
            'radial-gradient(circle, var(--cv-border) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage:
            'radial-gradient(ellipse 80% 70% at 50% 40%, black 20%, transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 70% at 50% 40%, black 20%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Gradient orbs */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '15%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '10%',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 40px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--cv-primary)" />
            <path
              d="M10 12L14 16L10 20"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M17 20H22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--cv-text)',
              fontFamily: 'var(--cv-font)',
              letterSpacing: '-0.02em',
            }}
          >
            CodeVision <span style={{ color: 'var(--cv-primary)' }}>AI</span>
          </span>
        </div>

        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--cv-muted)',
            textDecoration: 'none',
            fontFamily: 'var(--cv-font)',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid var(--cv-border)',
            background: 'var(--cv-panel)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--cv-text)';
            e.currentTarget.style.borderColor = 'var(--cv-border-strong)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--cv-muted)';
            e.currentTarget.style.borderColor = 'var(--cv-border)';
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Home
        </Link>
      </header>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Heading */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 56,
            animation: 'cv-fade-in-up 0.5s ease-out both',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 14px',
              borderRadius: '100px',
              background: 'var(--cv-primary-light, rgba(99,102,241,0.1))',
              color: 'var(--cv-primary)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontFamily: 'var(--cv-font)',
              marginBottom: 20,
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Step 1 of 2
          </span>

          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: 'var(--cv-text)',
              fontFamily: 'var(--cv-font)',
              marginBottom: 16,
            }}
          >
            Choose your language
          </h1>
          <p
            style={{
              fontSize: 18,
              color: 'var(--cv-muted)',
              fontFamily: 'var(--cv-font)',
              maxWidth: 440,
              lineHeight: 1.6,
            }}
          >
            Select a programming language to start writing and visualizing code
          </p>
        </div>

        {/* Language cards grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(260px, 320px))',
            gap: 20,
            width: '100%',
            maxWidth: 680,
          }}
        >
          {langs.map((lang, i) => (
            <div
              key={lang}
              style={{
                animation: `cv-fade-in-up 0.5s ease-out ${0.1 + i * 0.08}s both`,
              }}
            >
              <LanguageCard lang={lang} onSelect={handleSelect} />
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p
          style={{
            marginTop: 40,
            fontSize: 13,
            color: 'var(--cv-muted)',
            fontFamily: 'var(--cv-font)',
            animation: 'cv-fade-in-up 0.5s ease-out 0.5s both',
          }}
        >
          Full step-by-step visualization is available for Python · C, C++, Java coming soon
        </p>
      </main>
    </div>
  );
}
