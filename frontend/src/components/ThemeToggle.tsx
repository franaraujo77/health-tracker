/**
 * Theme Toggle Component
 *
 * A Material Design 3 theme toggle component that allows users to switch
 * between light, dark, and system theme modes.
 *
 * @packageDocumentation
 */

import { useTheme, type ThemeMode } from '../contexts/ThemeContext';
import { Icon } from './Icon';
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
        <Icon
          name={appliedTheme === 'light' ? 'light_mode' : 'dark_mode'}
          size={24}
          aria-label={undefined} // Button already has aria-label
        />
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
        <Icon name="light_mode" size={20} aria-label={undefined} />
        {showLabels && <span>Light</span>}
      </button>

      <button
        className={`theme-toggle-option ${mode === 'system' ? 'active' : ''}`}
        onClick={() => handleModeChange('system')}
        role="radio"
        aria-checked={mode === 'system'}
        aria-label={`System theme (currently ${isSystemDark ? 'dark' : 'light'})`}
      >
        <Icon name="computer" size={20} aria-label={undefined} />
        {showLabels && <span>Auto</span>}
      </button>

      <button
        className={`theme-toggle-option ${mode === 'dark' ? 'active' : ''}`}
        onClick={() => handleModeChange('dark')}
        role="radio"
        aria-checked={mode === 'dark'}
        aria-label="Dark theme"
      >
        <Icon name="dark_mode" size={20} aria-label={undefined} />
        {showLabels && <span>Dark</span>}
      </button>
    </div>
  );
}

export default ThemeToggle;
