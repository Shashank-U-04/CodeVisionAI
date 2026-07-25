'use client';

import { useRef, useEffect } from 'react';
import MonacoEditor, { type OnMount, type BeforeMount } from '@monaco-editor/react';
import { useThemeStore } from '@/stores/themeStore';
import { buildMonacoTheme, MONACO_THEME_NAME } from '@/lib/surfaceTheme';

interface Props {
  value: string;
  onChange: (value: string) => void;
  currentLine: number | null;
  readOnly?: boolean;
  onLineClick?: (line: number) => void;
  language?: string;
}

export function CodeEditor({ value, onChange, currentLine, readOnly = false, onLineClick, language }: Props) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const onLineClickRef = useRef(onLineClick);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    onLineClickRef.current = onLineClick;
  }, [onLineClick]);

  // Register both themes before Monaco paints, so the first frame is already
  // the right color instead of flashing vs-dark.
  const handleBeforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme(MONACO_THEME_NAME.light, buildMonacoTheme('light'));
    monaco.editor.defineTheme(MONACO_THEME_NAME.dark, buildMonacoTheme('dark'));
  };

  // Re-derive on every flip: the token values themselves change with
  // [data-theme], so the theme has to be rebuilt, not just re-selected.
  // rAF guarantees the attribute is flushed before we read computed styles.
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    const frame = requestAnimationFrame(() => {
      monaco.editor.defineTheme(MONACO_THEME_NAME[theme], buildMonacoTheme(theme));
      monaco.editor.setTheme(MONACO_THEME_NAME[theme]);
    });
    return () => cancelAnimationFrame(frame);
  }, [theme]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    monaco.editor.setTheme(MONACO_THEME_NAME[theme]);

    // Click-to-jump: when the user clicks on a line, find that step.
    editor.onMouseDown((e) => {
      const lineNumber = e.target?.position?.lineNumber;
      if (typeof lineNumber === 'number') {
        onLineClickRef.current?.(lineNumber);
      }
    });
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (currentLine === null) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      return;
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: new monaco.Range(currentLine, 1, currentLine, 1),
        options: {
          isWholeLine: true,
          className: 'cv-current-line',
          glyphMarginClassName: 'cv-current-line-glyph',
          stickiness: 1,
        },
      },
    ]);

    // Auto-scroll the editor to keep the current line in view
    editor.revealLineInCenterIfOutsideViewport(currentLine);
  }, [currentLine]);

  return (
    <MonacoEditor
      height="100%"
      language={language ?? 'python'}
      theme={MONACO_THEME_NAME[theme]}
      value={value}
      onChange={(val) => onChange(val ?? '')}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      options={{
        fontSize: 13,
        fontFamily: 'var(--font-geist-mono), Menlo, Consolas, monospace',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        glyphMargin: true,        // enable the gutter for our red arrow
        wordWrap: 'on',
        automaticLayout: true,
        readOnly,
        renderLineHighlight: 'line',
        padding: { top: 12, bottom: 12 },
        tabSize: 4,
        insertSpaces: true,
      }}
    />
  );
}
