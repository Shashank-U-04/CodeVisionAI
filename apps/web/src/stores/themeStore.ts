'use client';

import { create } from 'zustand';

export type Theme = 'dark' | 'light';

interface ThemeStore {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()((set) => ({
  theme: 'light',
  toggle: () =>
    set((prev) => {
      const next: Theme = prev.theme === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.theme = next;
        document.documentElement.classList.toggle('dark', next === 'dark');
      }
      return { theme: next };
    }),
  setTheme: (theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
    set({ theme });
  },
}));
