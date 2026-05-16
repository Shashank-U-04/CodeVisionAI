'use client';

import { useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useExecutionStore } from '@/stores/executionStore';
import { useThemeStore } from '@/stores/themeStore';
import { useEngine } from '@/hooks/useEngine';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { VisualizationPanel } from '@/components/visualization/VisualizationPanel';
import { XTermConsole } from '@/components/terminal/XTermConsole';
import { ExecutionControls } from '@/components/controls/ExecutionControls';
import { StepSlider } from '@/components/controls/StepSlider';
import { StepDescription } from '@/components/controls/StepDescription';
import { ThemeToggle } from '@/components/controls/ThemeToggle';

export default function AppPage() {
  const { run, provideInput, stop, registerTerminal } = useEngine();
  const theme = useThemeStore((s) => s.theme);

  const status        = useExecutionStore((s) => s.status);
  const code          = useExecutionStore((s) => s.code);
  const setCode       = useExecutionStore((s) => s.setCode);
  const steps         = useExecutionStore((s) => s.steps);
  const viewIndex     = useExecutionStore((s) => s.viewStepIndex);
  const setViewIndex  = useExecutionStore((s) => s.setViewStepIndex);
  const hasStarted    = useExecutionStore((s) => s.hasStartedVisualization);
  const startViz      = useExecutionStore((s) => s.startVisualization);
  const findFirstStep = useExecutionStore((s) => s.findFirstStepForLine);
  const error         = useExecutionStore((s) => s.error);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const currentState = hasStarted ? (steps[viewIndex] ?? null) : null;
  const currentLine  = currentState?.line ?? null;
  const isExecuting  = status === 'running' || status === 'paused_on_input';

  const goPrev = useCallback(() => {
    if (!hasStarted) return;
    setViewIndex(Math.max(0, viewIndex - 1));
  }, [hasStarted, viewIndex, setViewIndex]);

  const goNext = useCallback(() => {
    if (!hasStarted) return;
    setViewIndex(Math.min(steps.length - 1, viewIndex + 1));
  }, [hasStarted, viewIndex, steps.length, setViewIndex]);

  useKeyboardNav(goPrev, goNext);

  const handleLineClick = useCallback(
    (line: number) => {
      if (!hasStarted) return;
      const idx = findFirstStep(line);
      if (idx >= 0) setViewIndex(idx);
    },
    [hasStarted, findFirstStep, setViewIndex],
  );

  const canPrev = hasStarted && viewIndex > 0;
  const canNext = hasStarted && viewIndex < steps.length - 1;

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{ background: 'var(--cv-bg)', color: 'var(--cv-fg)' }}
    >
      {/* Header */}
      <header
        className="flex items-center gap-4 px-4 shrink-0"
        style={{
          height: 48,
          background: 'var(--cv-panel)',
          borderBottom: '1px solid var(--cv-border)',
        }}
      >
        <Link href="/" className="flex items-center gap-2 no-underline" style={{ textDecoration: 'none' }}>
          <CodeVisionLogo size={20} />
          <span
            className="text-sm font-bold tracking-tight"
            style={{ color: 'var(--cv-fg)', fontFamily: 'var(--cv-font)' }}
          >
            CodeVision <span style={{ color: 'var(--cv-primary)' }}>AI</span>
          </span>
        </Link>

        <span
          className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded"
          style={{
            background: 'var(--cv-panel-deep)',
            color: 'var(--cv-muted)',
            border: '1px solid var(--cv-border)',
            fontFamily: 'var(--cv-font)',
          }}
        >
          Python Visualizer
        </span>

        <ExecutionControls
          status={status}
          onRun={() => run(code)}
          onStop={stop}
          onPrev={goPrev}
          onNext={goNext}
          canPrev={canPrev}
          canNext={canNext}
        />

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px]" style={{ color: 'var(--cv-muted)', fontFamily: 'var(--cv-font)' }}>
            100% in-browser · Pyodide
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Step description bar */}
      <StepDescription
        state={currentState}
        stepCount={steps.length}
        viewIndex={viewIndex}
      />

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: editor + console (~40%) */}
        <div
          className="flex flex-col flex-shrink-0"
          style={{ width: '40%', borderRight: '1px solid var(--cv-border)' }}
        >
          <div className="flex flex-col flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <PanelTab label="main.py" dotColor="var(--cv-heap-tuple)" />
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                value={code}
                onChange={setCode}
                currentLine={currentLine}
                readOnly={isExecuting}
                onLineClick={handleLineClick}
              />
            </div>
          </div>

          <div
            className="flex flex-col"
            style={{ height: '38%', borderTop: '1px solid var(--cv-border)' }}
          >
            <PanelTab label="Console (input / output)" dotColor="var(--cv-accent)" />
            <div className="flex-1 overflow-hidden p-1.5" style={{ background: 'var(--cv-bg)' }}>
              <XTermConsole onInputSubmit={provideInput} registerHandle={registerTerminal} />
            </div>
            {error && (
              <div
                className="px-3 py-1.5 text-[11px] font-mono"
                style={{ background: 'rgba(220,38,38,0.10)', borderTop: '1px solid var(--cv-border)', color: '#fca5a5' }}
              >
                {error}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: visualization (~60%) */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <PanelTab label="Frames ◂ ─ ▸ Objects" dotColor="var(--cv-active-border)" />
          <VisualizationPanel
            state={currentState}
            status={status}
            hasStarted={hasStarted}
            stepCount={steps.length}
            onStart={startViz}
          />
        </div>
      </div>

      {/* Bottom timeline */}
      <div
        className="flex items-center gap-3 px-5 py-2 shrink-0"
        style={{ background: 'var(--cv-panel)', borderTop: '1px solid var(--cv-border)' }}
      >
        <span
          className="text-[10px] uppercase tracking-widest font-semibold whitespace-nowrap"
          style={{ color: 'var(--cv-muted)', fontFamily: 'var(--cv-font)' }}
        >
          Timeline
        </span>
        <StepSlider stepCount={steps.length} viewIndex={viewIndex} disabled={!hasStarted} onChange={setViewIndex} />
        <span className="text-[11px] font-mono whitespace-nowrap" style={{ color: 'var(--cv-muted)' }}>
          {steps.length > 0 ? `${hasStarted ? viewIndex + 1 : 0} / ${steps.length}` : '0 / 0'}
        </span>
      </div>
    </div>
  );
}

function PanelTab({ label, dotColor }: { label: string; dotColor: string }) {
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
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
      {label}
    </div>
  );
}

function CodeVisionLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="var(--cv-primary)" />
      <path d="M10 12L14 16L10 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 20H22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
