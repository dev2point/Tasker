'use client';

import React, { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

export type AppTheme = 'light' | 'dark';
export interface ThemeWaveOrigin {
  x: number;
  y: number;
}
export type ThemeTransitionOrigin = ThemeWaveOrigin | React.MouseEvent<HTMLElement> | MouseEvent;

const THEME_STORAGE_KEY = 'lmf_theme';
const themeListeners = new Set<() => void>();

function notifyThemeListeners() {
  themeListeners.forEach((cb) => cb());
}

function readStoredTheme(): AppTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyThemeToDocument(theme: AppTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
  }

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#061826' : '#004266');
  }
}

function resolveOriginCoordinates(origin?: ThemeTransitionOrigin): ThemeWaveOrigin | null {
  if (typeof window === 'undefined') return null;

  if (origin && 'clientX' in origin && 'clientY' in origin) {
    if (origin.clientX === 0 && origin.clientY === 0 && 'currentTarget' in origin && origin.currentTarget instanceof HTMLElement) {
      const rect = origin.currentTarget.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
    return { x: origin.clientX, y: origin.clientY };
  }

  if (origin && 'x' in origin && 'y' in origin) {
    return { x: origin.x, y: origin.y };
  }

  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };
}

function commitThemeUpdate(next: AppTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // ignore storage failure
  }
  applyThemeToDocument(next);
  notifyThemeListeners();
}

function runThemeWithWave(next: AppTheme, origin?: ThemeTransitionOrigin) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    commitThemeUpdate(next);
    return;
  }

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const docWithTransition = document as Document & {
    startViewTransition?: (callback: () => void) => {
      ready: Promise<void>;
      finished: Promise<void>;
    };
  };

  if (prefersReducedMotion || typeof docWithTransition.startViewTransition !== 'function') {
    commitThemeUpdate(next);
    return;
  }

  const coords = resolveOriginCoordinates(origin) ?? {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };
  const endRadius = Math.hypot(
    Math.max(coords.x, window.innerWidth - coords.x),
    Math.max(coords.y, window.innerHeight - coords.y)
  );

  const root = document.documentElement;
  root.classList.add('theme-wave-transition');

  const transition = docWithTransition.startViewTransition(() => {
    flushSync(() => {
      commitThemeUpdate(next);
    });
  });

  transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${coords.x}px ${coords.y}px)`,
            `circle(${endRadius}px at ${coords.x}px ${coords.y}px)`,
          ],
        },
        {
          duration: 650,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    })
    .catch(() => {
      // Ignore transition cancellation
    });

  transition.finished
    .finally(() => {
      root.classList.remove('theme-wave-transition');
    })
    .catch(() => {
      // Ignore transition cancellation
    });
}

function subscribeTheme(cb: () => void) {
  themeListeners.add(cb);
  if (typeof window === 'undefined') {
    return () => {
      themeListeners.delete(cb);
    };
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === THEME_STORAGE_KEY) {
      applyThemeToDocument(readStoredTheme());
      cb();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    themeListeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

interface ThemeContextValue {
  theme: AppTheme;
  isDark: boolean;
  setTheme: (next: AppTheme, origin?: ThemeTransitionOrigin) => void;
  toggleTheme: (origin?: ThemeTransitionOrigin) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useSyncExternalStore(subscribeTheme, readStoredTheme, () => 'light' as AppTheme);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setTheme = useCallback((next: AppTheme, origin?: ThemeTransitionOrigin) => {
    if (readStoredTheme() === next) {
      commitThemeUpdate(next);
      return;
    }
    runThemeWithWave(next, origin);
  }, []);

  const toggleTheme = useCallback(
    (origin?: ThemeTransitionOrigin) => {
      const current = readStoredTheme();
      setTheme(current === 'dark' ? 'light' : 'dark', origin);
    },
    [setTheme]
  );

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  const fallbackTheme = useSyncExternalStore(subscribeTheme, readStoredTheme, () => 'light' as AppTheme);

  const fallbackSetTheme = useCallback((next: AppTheme, origin?: ThemeTransitionOrigin) => {
    if (readStoredTheme() === next) {
      commitThemeUpdate(next);
      return;
    }
    runThemeWithWave(next, origin);
  }, []);

  const fallbackToggleTheme = useCallback(
    (origin?: ThemeTransitionOrigin) => {
      fallbackSetTheme(readStoredTheme() === 'dark' ? 'light' : 'dark', origin);
    },
    [fallbackSetTheme]
  );

  if (ctx) return ctx;
  return {
    theme: fallbackTheme,
    isDark: fallbackTheme === 'dark',
    setTheme: fallbackSetTheme,
    toggleTheme: fallbackToggleTheme,
  };
}
