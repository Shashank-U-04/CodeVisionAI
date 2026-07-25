'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useExecutionStore } from '@/stores/executionStore';
import { useThemeStore } from '@/stores/themeStore';
import { useLanguageStore, LANGUAGE_CONFIG } from '@/stores/languageStore';
import { useCodeStore } from '@/stores/codeStore';
import { useEngine } from '@/hooks/useEngine';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { VisualizationPanel } from '@/components/visualization/VisualizationPanel';
import { XTermConsole } from '@/components/terminal/XTermConsole';
import { ExecutionControls } from '@/components/controls/ExecutionControls';
import { StepSlider } from '@/components/controls/StepSlider';
import { StepDescription } from '@/components/controls/StepDescription';
import { ThemeToggle } from '@/components/controls/ThemeToggle';
import { LanguageSelectScreen } from '@/components/language-select/LanguageSelectScreen';
import { AppSecondaryNav } from '@/components/app/AppSecondaryNav';
import { PyodideLoadingOverlay } from '@/components/app/PyodideLoadingOverlay';
import { ShortcutsPopover } from '@/components/app/ShortcutsPopover';
import { OnboardingTour } from '@/components/app/OnboardingTour';
import { ExamplesDropdown } from '@/components/app/ExamplesDropdown';
import {
  CodeVisionLogo,
  PanelTab,
  EditorPanelTab,
  ComingSoonPanel,
} from '@/components/app/WorkspaceParts';

export default function AppPage() {
  const { run, provideInput, stop, registerTerminal } = useEngine();
  const theme = useThemeStore((s) => s.theme);

  const selectedLanguage = useLanguageStore((s) => s.selectedLanguage);
  const clearLanguage    = useLanguageStore((s) => s.clearLanguage);

  const status        = useExecutionStore((s) => s.status);
  const steps         = useExecutionStore((s) => s.steps);
  const viewIndex     = useExecutionStore((s) => s.viewStepIndex);
  const setViewIndex  = useExecutionStore((s) => s.setViewStepIndex);
  const hasStarted    = useExecutionStore((s) => s.hasStartedVisualization);
  const startViz      = useExecutionStore((s) => s.startVisualization);
  const findFirstStep = useExecutionStore((s) => s.findFirstStepForLine);
  const error         = useExecutionStore((s) => s.error);

  // Per-language code drafts (persisted). Until language is chosen we hide
  // the workspace, so it's safe to default to python here.
  const activeLang = selectedLanguage ?? 'python';
  const code = useCodeStore((s) => s.codes[activeLang]);
  const setCodeForLang = useCodeStore((s) => s.setCode);
  const setCode = useCallback(
    (next: string) => setCodeForLang(activeLang, next),
    [activeLang, setCodeForLang],
  );

  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Landing-page CTAs link to /app?pick=1 so the language picker always shows
  // for new arrivals, even if a previous language is persisted. After we
  // honor it we strip the param from the URL so refresh respects persistence.
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get('pick') === '1') {
      clearLanguage();
      router.replace('/app');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Apply prefill code from a tutorial deep-link (set in /learn/[slug]).
  // We run this exactly once on mount; cleared from sessionStorage immediately.
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem('codevision:prefill');
      if (prefill) {
        setCode(prefill);
        sessionStorage.removeItem('codevision:prefill');
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Global key handlers: `?` opens shortcuts, Esc closes popovers / stops run.
  useEffect(() => {
    const isEditable = (t: EventTarget | null) => {
      if (!(t instanceof HTMLElement)) return false;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return true;
      if (t.isContentEditable) return true;
      if (t.closest('.monaco-editor')) return true;
      if (t.closest('.xterm')) return true;
      return false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShortcutsOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  // Language gate — render after all hooks are declared
  if (!selectedLanguage) {
    return <LanguageSelectScreen />;
  }

  const langConfig = LANGUAGE_CONFIG[selectedLanguage];

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
        <Link href="/" className="flex items-center gap-2 no-underline" style={{ textDecoration: 'none' }} aria-label="CodeVision AI home">
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
          {langConfig.label} Visualizer
        </span>

        <ExecutionControls
          status={status}
          onRun={() => {
            if (!langConfig.isVisualizationSupported) return;
            run(code);
          }}
          onStop={stop}
          onPrev={goPrev}
          onNext={goNext}
          canPrev={canPrev}
          canNext={canNext}
        />

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px]" style={{ color: 'var(--cv-muted)', fontFamily: 'var(--cv-font)' }}>
            {langConfig.engineNote}
          </span>
          <button
            onClick={clearLanguage}
            aria-label={`Change language (current: ${langConfig.label})`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 'var(--cv-radius-sm)',
              border: '1px solid var(--cv-border)',
              background: 'transparent',
              color: 'var(--cv-muted)',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--cv-font)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--cv-primary)';
              e.currentTarget.style.color = 'var(--cv-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--cv-border)';
              e.currentTarget.style.color = 'var(--cv-muted)';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {langConfig.label}
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Secondary nav */}
      <AppSecondaryNav language={langConfig.label} onOpenShortcuts={() => setShortcutsOpen(true)} />

      {/* Step description bar */}
      <StepDescription
        state={currentState}
        stepCount={steps.length}
        viewIndex={viewIndex}
      />

      {/* Main split */}
      <main id="main" className="flex flex-1 overflow-hidden">
        {/* LEFT: editor + console (~40%) */}
        <div
          className="flex flex-col flex-shrink-0"
          style={{ width: '40%', borderRight: '1px solid var(--cv-border)' }}
        >
          <div className="flex flex-col flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <EditorPanelTab
              label={langConfig.fileName}
              dotColor="var(--cv-heap-tuple)"
              right={
                <ExamplesDropdown
                  language={selectedLanguage}
                  onPick={(c) => setCode(c)}
                  disabled={isExecuting}
                />
              }
            />
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                value={code}
                onChange={setCode}
                currentLine={currentLine}
                readOnly={isExecuting}
                onLineClick={handleLineClick}
                language={langConfig.monacoLanguage}
              />
            </div>
          </div>

          <div
            className="flex flex-col"
            style={{ height: '38%', borderTop: '1px solid var(--cv-border)' }}
          >
            <PanelTab label="Console (input / output)" dotColor="var(--cv-accent)" />
            <div className="flex-1 overflow-hidden p-1.5" style={{ background: 'var(--cv-console-bg)' }}>
              <XTermConsole onInputSubmit={provideInput} registerHandle={registerTerminal} />
            </div>
            {error && (
              <div
                className="px-3 py-1.5 text-[11px] font-mono"
                style={{ background: 'rgba(220,38,38,0.10)', borderTop: '1px solid var(--cv-border)', color: 'var(--cv-danger)' }}
                role="alert"
              >
                {error}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: visualization (~60%) */}
        <aside
          className="flex flex-col flex-1 overflow-hidden"
          aria-label="Visualization panel"
        >
          <PanelTab
            label={langConfig.isVisualizationSupported ? 'Frames ◂ ─ ▸ Objects' : `${langConfig.label} Editor`}
            dotColor="var(--cv-active-border)"
          />
          {langConfig.isVisualizationSupported ? (
            <VisualizationPanel
              state={currentState}
              status={status}
              hasStarted={hasStarted}
              stepCount={steps.length}
              onStart={startViz}
              error={error}
            />
          ) : (
            <ComingSoonPanel language={langConfig.label} color={langConfig.color} />
          )}
        </aside>
      </main>

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

      {/* Overlays — render last so they sit on top */}
      <PyodideLoadingOverlay visible={status === 'initializing'} />
      <ShortcutsPopover open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {langConfig.isVisualizationSupported && status !== 'initializing' && <OnboardingTour />}
    </div>
  );
}

