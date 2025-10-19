/**
 * Material Design 3 Theme Management
 * Handles theme switching and persistence with lazy-loaded theme CSS
 */

import type { Theme } from './tokens/types';

const STORAGE_KEY = 'health-tracker-theme';
const THEME_ATTRIBUTE = 'data-theme';

/**
 * Track which theme CSS modules have been loaded to avoid re-importing
 */
const loadedThemes = new Set<Theme>();

/**
 * Dynamically load theme-specific CSS
 * Uses Vite's dynamic import for code splitting
 *
 * @param theme - Theme to load ('light' | 'dark')
 */
async function loadThemeCSS(theme: Theme): Promise<void> {
  // Skip if already loaded
  if (loadedThemes.has(theme)) {
    return;
  }

  try {
    if (theme === 'dark') {
      await import('./tokens/theme-dark.css');
    } else {
      await import('./tokens/theme-light.css');
    }
    loadedThemes.add(theme);
  } catch (error) {
    console.error(`Failed to load ${theme} theme CSS:`, error);
  }
}

/**
 * Apply a theme to the document
 * Loads theme CSS dynamically before applying
 *
 * @param theme - Theme to apply ('light' | 'dark')
 *
 * @example
 * ```tsx
 * await setTheme('dark'); // Switches to dark theme
 * ```
 */
export async function setTheme(theme: Theme): Promise<void> {
  // Load theme CSS first to prevent FOUC
  await loadThemeCSS(theme);

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
 * @returns Promise that resolves to the new theme after toggling
 *
 * @example
 * ```tsx
 * <button onClick={() => toggleTheme()}>
 *   Toggle Theme
 * </button>
 * ```
 */
export async function toggleTheme(): Promise<Theme> {
  const currentTheme = getTheme();
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  await setTheme(newTheme);
  return newTheme;
}

/**
 * Initialize theme on app load
 * Priority: saved preference > system preference > light
 * Loads theme CSS synchronously to prevent FOUC
 *
 * Call this function in your app's entry point (main.tsx or App.tsx)
 * before React renders
 *
 * @example
 * ```tsx
 * // In main.tsx
 * import { initializeTheme } from './styles/theme';
 *
 * initializeTheme(); // Call before createRoot().render()
 * ```
 */
export function initializeTheme(): void {
  const savedTheme = getSavedTheme();
  const theme = savedTheme || getSystemTheme();

  // Load theme CSS synchronously to prevent FOUC
  // Use void to fire-and-forget the promise
  void setTheme(theme);
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
      void setTheme(event.matches ? 'dark' : 'light');
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
