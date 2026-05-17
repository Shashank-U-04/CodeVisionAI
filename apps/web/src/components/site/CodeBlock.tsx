'use client';

import { useState } from 'react';

/**
 * Lightweight Python syntax highlighter — same approach as HeroSection's SyntaxSpan
 * but factored out so tutorials and docs can share it.
 *
 * Intentionally tiny: keywords + builtins + strings + numbers + comments.
 * For richer highlighting users get the real Monaco editor inside /app.
 */

const PY_KEYWORDS = new Set([
  'class', 'def', 'return', 'for', 'in', 'if', 'elif', 'else', 'while',
  'import', 'from', 'as', 'and', 'or', 'not', 'is', 'lambda', 'yield',
  'pass', 'break', 'continue', 'try', 'except', 'finally', 'raise', 'with',
  'global', 'nonlocal',
]);

const PY_BUILTINS = new Set([
  'print', 'range', 'len', 'int', 'str', 'list', 'dict', 'set', 'tuple',
  'True', 'False', 'None', 'input', 'sum', 'min', 'max', 'abs', 'sorted',
  'enumerate', 'zip', 'map', 'filter',
]);

function highlightLine(code: string) {
  const parts: { text: string; color: string }[] = [];
  let i = 0;
  while (i < code.length) {
    if (code[i] === '#') {
      parts.push({ text: code.slice(i), color: 'var(--cv-syn-comment)' });
      break;
    }
    if (code[i] === '"' || code[i] === "'") {
      const q = code[i];
      let j = i + 1;
      while (j < code.length && code[j] !== q) {
        if (code[j] === '\\') j++;
        j++;
      }
      parts.push({ text: code.slice(i, Math.min(j + 1, code.length)), color: 'var(--cv-syn-string)' });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(code[i]) && (i === 0 || /[^a-zA-Z_]/.test(code[i - 1]))) {
      let j = i;
      while (j < code.length && /[0-9.]/.test(code[j])) j++;
      parts.push({ text: code.slice(i, j), color: 'var(--cv-syn-number)' });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_]/.test(code[j])) j++;
      const word = code.slice(i, j);
      if (word === 'self') parts.push({ text: word, color: 'var(--cv-syn-self)' });
      else if (PY_KEYWORDS.has(word)) parts.push({ text: word, color: 'var(--cv-syn-keyword)' });
      else if (PY_BUILTINS.has(word)) parts.push({ text: word, color: 'var(--cv-syn-builtin)' });
      else parts.push({ text: word, color: 'var(--cv-text)' });
      i = j;
      continue;
    }
    parts.push({ text: code[i], color: 'var(--cv-text)' });
    i++;
  }
  return parts;
}

interface Props {
  code: string;
  language?: 'python' | 'text';
  filename?: string;
  /** show the copy button (default true) */
  copyable?: boolean;
}

export function CodeBlock({ code, language = 'python', filename, copyable = true }: Props) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, '').split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard may be unavailable (http, sandbox) — silently ignore
    }
  };

  return (
    <div
      style={{
        borderRadius: 'var(--cv-radius-lg)',
        border: '1px solid var(--cv-border)',
        background: 'var(--cv-code-bg)',
        overflow: 'hidden',
        margin: '20px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          background: 'var(--cv-surface-deep)',
          borderBottom: '1px solid var(--cv-border)',
          fontFamily: 'var(--cv-font)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
            color: 'var(--cv-text-muted)',
          }}
        >
          {filename ?? (language === 'python' ? 'main.py' : 'snippet')}
        </span>
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy code to clipboard"
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--cv-radius-sm)',
              border: '1px solid var(--cv-border)',
              background: 'var(--cv-surface)',
              color: 'var(--cv-text-muted)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--cv-font)',
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      <pre
        style={{
          margin: 0,
          padding: '14px 0',
          fontFamily: 'var(--cv-font-mono)',
          fontSize: 13.5,
          lineHeight: 1.7,
          overflowX: 'auto',
        }}
      >
        {lines.map((line, i) => (
          <div key={i} style={{ display: 'flex', padding: '0 14px', whiteSpace: 'pre' }}>
            <span
              style={{
                width: 28,
                textAlign: 'right',
                paddingRight: 14,
                color: 'var(--cv-text-faint)',
                userSelect: 'none',
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <span style={{ whiteSpace: 'pre' }}>
              {language === 'python'
                ? highlightLine(line).map((p, pi) => (
                    <span key={pi} style={{ color: p.color }}>
                      {p.text}
                    </span>
                  ))
                : line}
            </span>
          </div>
        ))}
      </pre>
    </div>
  );
}
