/**
 * Material Design 3 Token Types
 * Type-safe access to M3 design tokens
 */

/**
 * All Material Design 3 color role names
 * @see https://m3.material.io/styles/color/roles
 */
export type MDColorToken =
  // Primary colors
  | 'primary'
  | 'on-primary'
  | 'primary-container'
  | 'on-primary-container'
  // Secondary colors
  | 'secondary'
  | 'on-secondary'
  | 'secondary-container'
  | 'on-secondary-container'
  // Tertiary colors
  | 'tertiary'
  | 'on-tertiary'
  | 'tertiary-container'
  | 'on-tertiary-container'
  // Error colors
  | 'error'
  | 'on-error'
  | 'error-container'
  | 'on-error-container'
  // Background colors
  | 'background'
  | 'on-background'
  // Surface colors
  | 'surface'
  | 'on-surface'
  | 'surface-variant'
  | 'on-surface-variant'
  | 'surface-dim'
  | 'surface-bright'
  // Surface containers
  | 'surface-container-lowest'
  | 'surface-container-low'
  | 'surface-container'
  | 'surface-container-high'
  | 'surface-container-highest'
  // Outline colors
  | 'outline'
  | 'outline-variant'
  // Inverse colors
  | 'inverse-surface'
  | 'inverse-on-surface'
  | 'inverse-primary'
  // Utility colors
  | 'scrim'
  | 'shadow';

/**
 * Theme variants
 */
export type Theme = 'light' | 'dark';

/**
 * Get CSS custom property reference for an M3 color token
 *
 * @param token - The M3 color role name
 * @returns CSS custom property string (e.g., "var(--md-sys-color-primary)")
 *
 * @example
 * ```tsx
 * const buttonStyle = {
 *   backgroundColor: getColorToken('primary'),
 *   color: getColorToken('on-primary')
 * };
 * ```
 */
export function getColorToken(token: MDColorToken): string {
  return `var(--md-sys-color-${token})`;
}

/**
 * Get raw CSS custom property name for an M3 color token
 *
 * @param token - The M3 color role name
 * @returns CSS custom property name (e.g., "--md-sys-color-primary")
 *
 * @example
 * ```tsx
 * document.documentElement.style.setProperty(
 *   getColorTokenName('primary'),
 *   '#2E7D32'
 * );
 * ```
 */
export function getColorTokenName(token: MDColorToken): string {
  return `--md-sys-color-${token}`;
}

/**
 * Type guard to check if a string is a valid MDColorToken
 *
 * @param value - String to check
 * @returns True if value is a valid M3 color token name
 *
 * @example
 * ```tsx
 * if (isMDColorToken('primary')) {
 *   // TypeScript now knows this is a valid token
 * }
 * ```
 */
export function isMDColorToken(value: string): value is MDColorToken {
  const validTokens: readonly string[] = [
    'primary',
    'on-primary',
    'primary-container',
    'on-primary-container',
    'secondary',
    'on-secondary',
    'secondary-container',
    'on-secondary-container',
    'tertiary',
    'on-tertiary',
    'tertiary-container',
    'on-tertiary-container',
    'error',
    'on-error',
    'error-container',
    'on-error-container',
    'background',
    'on-background',
    'surface',
    'on-surface',
    'surface-variant',
    'on-surface-variant',
    'surface-dim',
    'surface-bright',
    'surface-container-lowest',
    'surface-container-low',
    'surface-container',
    'surface-container-high',
    'surface-container-highest',
    'outline',
    'outline-variant',
    'inverse-surface',
    'inverse-on-surface',
    'inverse-primary',
    'scrim',
    'shadow',
  ] as const;

  return validTokens.includes(value);
}
