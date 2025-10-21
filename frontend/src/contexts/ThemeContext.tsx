/**
 * Theme Context for Material Design 3
 *
 * Provides theme state and controls to the entire application using React Context.
 * Manages light/dark mode switching, system preference detection, and theme persistence.
 *
 * @packageDocumentation
 */

/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

import {
  generateThemeFromColor,
  applyColorScheme,
  getCurrentScheme,
  type Theme,
  type ColorScheme,
} from '../styles/colorUtils';
import { TOKENS_METADATA } from '../styles/tokens/version';

/**
 * Theme mode types
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Theme context state
 */
export interface ThemeContextValue {
  /** Current theme mode (light, dark, or system) */
  mode: ThemeMode;

  /** Actual applied theme (resolved from system if mode is 'system') */
  appliedTheme: 'light' | 'dark';

  /** Current color scheme */
  colorScheme: ColorScheme;

  /** Complete theme object with light and dark schemes */
  theme: Theme;

  /** Set theme mode */
  setThemeMode: (mode: ThemeMode) => void;

  /** Toggle between light and dark (ignores system) */
  toggleTheme: () => void;

  /** Check if system dark mode is preferred */
  isSystemDark: boolean;
}

/**
 * Local storage key for theme preference
 */
const THEME_STORAGE_KEY = 'health-tracker-theme-mode';

/**
 * Default seed color from tokens metadata
 */
const DEFAULT_SEED_COLOR = TOKENS_METADATA.seedColor;

/**
 * Theme Context
 */
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Theme Provider Props
 */
export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Optional seed color for dynamic theming (defaults to #4CAF50) */
  seedColor?: string;
  /** Optional default mode (defaults to 'system') */
  defaultMode?: ThemeMode;
}

/**
 * Get system dark mode preference
 */
function getSystemDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get stored theme mode from localStorage
 */
function getStoredThemeMode(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return null;
}

/**
 * Store theme mode in localStorage
 */
function storeThemeMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, mode);
}

/**
 * Theme Provider Component
 *
 * @example
 * ```tsx
 * import { ThemeProvider } from './contexts/ThemeContext';
 *
 * function App() {
 *   return (
 *     <ThemeProvider seedColor="#4CAF50">
 *       <YourApp />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 */
export function ThemeProvider({
  children,
  seedColor = DEFAULT_SEED_COLOR,
  defaultMode = 'system',
}: ThemeProviderProps) {
  // Generate theme from seed color (memoized)
  const theme = useMemo(() => generateThemeFromColor(seedColor), [seedColor]);

  // Track system dark mode preference
  const [isSystemDark, setIsSystemDark] = useState(getSystemDarkMode);

  // Initialize mode from localStorage or default
  const [mode, setMode] = useState<ThemeMode>(() => {
    return getStoredThemeMode() || defaultMode;
  });

  // Calculate applied theme based on mode
  const appliedTheme: 'light' | 'dark' = useMemo(() => {
    if (mode === 'system') {
      return isSystemDark ? 'dark' : 'light';
    }
    return mode;
  }, [mode, isSystemDark]);

  // Get current color scheme
  const colorScheme = useMemo(() => {
    return getCurrentScheme(theme, appliedTheme === 'dark');
  }, [theme, appliedTheme]);

  // Set theme mode with persistence
  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    storeThemeMode(newMode);
  }, []);

  // Toggle between light and dark (sets explicit mode, ignores system)
  const toggleTheme = useCallback(() => {
    const newMode = appliedTheme === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  }, [appliedTheme, setThemeMode]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsSystemDark(e.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Apply color scheme to DOM when it changes
  useEffect(() => {
    applyColorScheme(colorScheme, appliedTheme === 'dark');
  }, [colorScheme, appliedTheme]);

  // Context value (memoized to prevent unnecessary re-renders)
  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      appliedTheme,
      colorScheme,
      theme,
      setThemeMode,
      toggleTheme,
      isSystemDark,
    }),
    [mode, appliedTheme, colorScheme, theme, setThemeMode, toggleTheme, isSystemDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 *
 * @throws Error if used outside ThemeProvider
 *
 * @example
 * ```tsx
 * import { useTheme } from './contexts/ThemeContext';
 *
 * function MyComponent() {
 *   const { appliedTheme, toggleTheme, colorScheme } = useTheme();
 *
 *   return (
 *     <button onClick={toggleTheme}>
 *       Current theme: {appliedTheme}
 *     </button>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Export context for advanced use cases
 * Note: This export is intentional for advanced use cases (e.g., custom hooks, testing)
 */
export { ThemeContext };
