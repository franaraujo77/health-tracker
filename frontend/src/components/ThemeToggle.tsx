/**
 * Theme Toggle Component
 *
 * A Material Design 3 theme toggle component that allows users to switch
 * between light, dark, and system theme modes.
 *
 * @packageDocumentation
 */

import { useTheme, type ThemeMode } from '../contexts/ThemeContext';
import './ThemeToggle.css';

/**
 * Theme Toggle Props
 */
export interface ThemeToggleProps {
  /** Optional CSS class name */
  className?: string;
  /** Show labels alongside icons */
  showLabels?: boolean;
  /** Variant style */
  variant?: 'segmented' | 'icon-button';
}

/**
 * Theme Toggle Component
 *
 * Provides a UI control for switching between light, dark, and system themes.
 *
 * @example
 * ```tsx
 * import { ThemeToggle } from './components/ThemeToggle';
 *
 * function AppHeader() {
 *   return (
 *     <header>
 *       <h1>My App</h1>
 *       <ThemeToggle showLabels />
 *     </header>
 *   );
 * }
 * ```
 */
export function ThemeToggle({
  className = '',
  showLabels = false,
  variant = 'segmented',
}: ThemeToggleProps) {
  const { mode, setThemeMode, appliedTheme, isSystemDark } = useTheme();

  const handleModeChange = (newMode: ThemeMode) => {
    setThemeMode(newMode);
  };

  if (variant === 'icon-button') {
    return (
      <button
        className={`theme-toggle-icon ${className}`}
        onClick={() => setThemeMode(appliedTheme === 'light' ? 'dark' : 'light')}
        aria-label={`Switch to ${appliedTheme === 'light' ? 'dark' : 'light'} theme`}
        title={`Switch to ${appliedTheme === 'light' ? 'dark' : 'light'} theme`}
      >
        {appliedTheme === 'light' ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <div className={`theme-toggle ${className}`} role="radiogroup" aria-label="Theme selection">
      <button
        className={`theme-toggle-option ${mode === 'light' ? 'active' : ''}`}
        onClick={() => handleModeChange('light')}
        role="radio"
        aria-checked={mode === 'light'}
        aria-label="Light theme"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        {showLabels && <span>Light</span>}
      </button>

      <button
        className={`theme-toggle-option ${mode === 'system' ? 'active' : ''}`}
        onClick={() => handleModeChange('system')}
        role="radio"
        aria-checked={mode === 'system'}
        aria-label={`System theme (currently ${isSystemDark ? 'dark' : 'light'})`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {showLabels && <span>Auto</span>}
      </button>

      <button
        className={`theme-toggle-option ${mode === 'dark' ? 'active' : ''}`}
        onClick={() => handleModeChange('dark')}
        role="radio"
        aria-checked={mode === 'dark'}
        aria-label="Dark theme"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
        {showLabels && <span>Dark</span>}
      </button>
    </div>
  );
}

export default ThemeToggle;
