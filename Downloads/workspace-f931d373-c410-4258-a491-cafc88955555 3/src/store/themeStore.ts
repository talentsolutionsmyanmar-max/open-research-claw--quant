// QuentrexKillzone OS v7.0 - Theme Store
// Powered by Ko Htike

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'dark' ? 'light' : 'dark' 
      })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'quentrex-theme',
    }
  )
);

// Theme colors
export const THEMES = {
  dark: {
    background: '#0a0a0f',
    card: 'rgba(15, 15, 25, 0.8)',
    primary: '#00ff41',
    secondary: '#00cfff',
    accent: '#ff0055',
    gold: '#ffd700',
    purple: '#bf00ff',
    text: '#e0e0e0',
    muted: '#808090',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  light: {
    background: '#f8f9fa',
    card: 'rgba(255, 255, 255, 0.95)',
    primary: '#00a32e',
    secondary: '#0095b6',
    accent: '#dc0045',
    gold: '#b8860b',
    purple: '#8b00cc',
    text: '#1a1a2e',
    muted: '#6c757d',
    border: 'rgba(0, 0, 0, 0.1)',
  }
};
