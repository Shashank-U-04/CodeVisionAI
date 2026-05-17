'use client';

/**
 * Small presentational helpers used by /app/page.tsx.
 * Extracted to keep the route file under the 400-line ceiling.
 */

export function CodeVisionLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--cv-primary)" />
      <path d="M10 12L14 16L10 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 20H22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function PanelTab({ label, dotColor }: { label: string; dotColor: string }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-widest font-semibold shrink-0"
      style={{
        background: 'var(--cv-panel)',
        color: 'var(--cv-muted)',
        borderBottom: '1px solid var(--cv-border)',
        fontFamily: 'var(--cv-font)',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} aria-hidden="true" />
      {label}
    </div>
  );
}

export function EditorPanelTab({
  label,
  dotColor,
  right,
}: {
  label: string;
  dotColor: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 shrink-0"
      style={{
        background: 'var(--cv-panel)',
        color: 'var(--cv-muted)',
        borderBottom: '1px solid var(--cv-border)',
        fontFamily: 'var(--cv-font)',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} aria-hidden="true" />
      <span className="text-[11px] uppercase tracking-widest font-semibold">{label}</span>
      {right && <span style={{ marginLeft: 'auto' }}>{right}</span>}
    </div>
  );
}

export function ComingSoonPanel({ language, color }: { language: string; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 40,
        background: 'var(--cv-bg)',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          border: `2px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
          background: `${color}12`,
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--cv-text)',
            fontFamily: 'var(--cv-font)',
            marginBottom: 8,
          }}
        >
          {language} Visualization Coming Soon
        </div>
        <div
          style={{
            fontSize: 14,
            color: 'var(--cv-muted)',
            fontFamily: 'var(--cv-font)',
            lineHeight: 1.6,
            maxWidth: 340,
          }}
        >
          Step-by-step heap and stack visualization for {language} is in development.
          The code editor is fully functional — write and explore your code now.
        </div>
      </div>
      <div
        style={{
          marginTop: 8,
          padding: '8px 16px',
          borderRadius: '8px',
          background: `${color}12`,
          border: `1px solid ${color}30`,
          fontSize: 12,
          color,
          fontFamily: 'var(--cv-font)',
          fontWeight: 500,
        }}
      >
        Try Python for full visualization support
      </div>
    </div>
  );
}
