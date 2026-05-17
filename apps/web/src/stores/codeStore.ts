'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { DEFAULT_CODE, type Language } from './languageStore';

interface CodeStore {
  codes: Record<Language, string>;
  setCode: (lang: Language, code: string) => void;
  resetCode: (lang: Language) => void;
}

// Each language has its own draft. Switching language no longer wipes what
// you were writing in the other language, and refresh keeps all four drafts.
export const useCodeStore = create<CodeStore>()(
  persist(
    (set) => ({
      codes: { ...DEFAULT_CODE },
      setCode: (lang, code) =>
        set((prev) => ({ codes: { ...prev.codes, [lang]: code } })),
      resetCode: (lang) =>
        set((prev) => ({ codes: { ...prev.codes, [lang]: DEFAULT_CODE[lang] } })),
    }),
    {
      name: 'codevision-code',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // If a new language is added later, fill in its DEFAULT_CODE entry.
      merge: (persisted, current) => {
        const p = (persisted as Partial<CodeStore>) ?? {};
        return {
          ...current,
          ...p,
          codes: { ...current.codes, ...(p.codes ?? {}) },
        };
      },
    },
  ),
);
