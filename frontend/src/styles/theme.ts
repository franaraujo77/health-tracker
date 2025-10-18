/**
 * Material Design 3 Theme Management
 * Handles theme switching and persistence
 */

import type { Theme } from './tokens/types';

const STORAGE_KEY = 'health-tracker-theme';
const THEME_ATTRIBUTE = 'data-theme';

/**
 * Apply a theme to the document
 *
 * @param theme - Theme to apply ('light' | 'dark')
 *
 * @example
 * ```tsx
 * setTheme('dark'); // Switches to dark theme
 * ```
 */
export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    // localStorage might be unavailable (private browsing, etc.)
    console.warn('Failed to persist theme preference:', error);
  }
}

/**
 * Get the current active theme
 *
 * @returns Current theme ('light' | 'dark')
 *
 * @example
 * ```tsx
 * const currentTheme = getTheme();
 * console.log(`Current theme: ${currentTheme}`);
 * ```
 */
export function getTheme(): Theme {
  const attribute = document.documentElement.getAttribute(THEME_ATTRIBUTE);
  return attribute === 'dark' ? 'dark' : 'light';
}

/**
 * Get the system's preferred color scheme
 *
 * @returns System theme preference ('light' | 'dark')
 *
 * @example
 * ```tsx
 * const systemTheme = getSystemTheme();
 * if (systemTheme === 'dark') {
 *   setTheme('dark');
 * }
 * ```
 */
export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get saved theme preference from localStorage
 *
 * @returns Saved theme preference or null if none exists
 */
export function getSavedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'dark' || saved === 'light' ? saved : null;
  } catch {
    // localStorage might be unavailable (private browsing, etc.)
    return null;
  }
}

/**
 * Toggle between light and dark themes
 *
 * @returns The new theme after toggling
 *
 * @example
 * ```tsx
 * <button onClick={() => toggleTheme()}>
 *   Toggle Theme
 * </button>
 * ```
 */
export function toggleTheme(): Theme {
  const currentTheme = getTheme();
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  return newTheme;
}

/**
 * Initialize theme on app load
 * Priority: saved preference > system preference > light
 *
 * Call this function in your app's entry point (main.tsx or App.tsx)
 *
 * @example
 * ```tsx
 * // In main.tsx
 * import { initializeTheme } from './styles/theme';
 *
 * initializeTheme();
 * ```
 */
export function initializeTheme(): void {
  const savedTheme = getSavedTheme();
  const theme = savedTheme || getSystemTheme();
  setTheme(theme);
}

/**
 * Listen for system theme changes and apply them automatically
 * Only applies if user hasn't explicitly set a theme preference
 *
 * @returns Cleanup function to remove the listener
 *
 * @example
 * ```tsx
 * // In App.tsx
 * useEffect(() => {
 *   const cleanup = watchSystemTheme();
 *   return cleanup;
 * }, []);
 * ```
 */
export function watchSystemTheme(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (event: MediaQueryListEvent) => {
    // Only auto-switch if user hasn't set a preference
    const savedTheme = getSavedTheme();
    if (!savedTheme) {
      setTheme(event.matches ? 'dark' : 'light');
    }
  };

  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }

  // Legacy browsers
  if (mediaQuery.addListener) {
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }

  return () => {};
}
