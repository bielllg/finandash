import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme-preference') as Theme;
    return saved || 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const isDarkOS = window.matchMedia('(prefers-color-scheme: dark)').matches;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      root.setAttribute('data-theme', isDarkOS ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
    
    localStorage.setItem('theme-preference', theme);
  }, [theme]);

  // Listen for system changes if 'system' is selected
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  return { theme, setTheme };
}
