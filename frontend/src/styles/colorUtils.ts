/**
 * Material Design 3 Color Utilities
 *
 * Wrapper around @material/material-color-utilities for generating
 * M3 color schemes from source colors. Supports dynamic theming with
 * automatic light/dark mode palette generation.
 *
 * @packageDocumentation
 */

import {
  argbFromHex,
  hexFromArgb,
  Hct,
  SchemeTonalSpot,
  TonalPalette,
} from '@material/material-color-utilities';

/**
 * M3 color scheme containing all theme colors
 */
export interface ColorScheme {
  // Primary colors
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;

  // Secondary colors
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  // Tertiary colors
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;

  // Error colors
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;

  // Surface colors
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;

  // Background (deprecated in M3 but still in v0.3.0)
  background: string;
  onBackground: string;

  // Outline colors
  outline: string;
  outlineVariant: string;

  // Inverse colors
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;

  // Other colors
  shadow: string;
  scrim: string;
}

/**
 * Theme containing light and dark color schemes
 */
export interface Theme {
  light: ColorScheme;
  dark: ColorScheme;
  sourceColor: string;
}

/**
 * Convert Material Color Utilities Scheme to our ColorScheme interface
 */
function schemeToColorScheme(scheme: SchemeTonalSpot): ColorScheme {
  return {
    primary: hexFromArgb(scheme.primary),
    onPrimary: hexFromArgb(scheme.onPrimary),
    primaryContainer: hexFromArgb(scheme.primaryContainer),
    onPrimaryContainer: hexFromArgb(scheme.onPrimaryContainer),

    secondary: hexFromArgb(scheme.secondary),
    onSecondary: hexFromArgb(scheme.onSecondary),
    secondaryContainer: hexFromArgb(scheme.secondaryContainer),
    onSecondaryContainer: hexFromArgb(scheme.onSecondaryContainer),

    tertiary: hexFromArgb(scheme.tertiary),
    onTertiary: hexFromArgb(scheme.onTertiary),
    tertiaryContainer: hexFromArgb(scheme.tertiaryContainer),
    onTertiaryContainer: hexFromArgb(scheme.onTertiaryContainer),

    error: hexFromArgb(scheme.error),
    onError: hexFromArgb(scheme.onError),
    errorContainer: hexFromArgb(scheme.errorContainer),
    onErrorContainer: hexFromArgb(scheme.onErrorContainer),

    surface: hexFromArgb(scheme.surface),
    onSurface: hexFromArgb(scheme.onSurface),
    surfaceVariant: hexFromArgb(scheme.surfaceVariant),
    onSurfaceVariant: hexFromArgb(scheme.onSurfaceVariant),

    background: hexFromArgb(scheme.background),
    onBackground: hexFromArgb(scheme.onBackground),

    outline: hexFromArgb(scheme.outline),
    outlineVariant: hexFromArgb(scheme.outlineVariant),

    inverseSurface: hexFromArgb(scheme.inverseSurface),
    inverseOnSurface: hexFromArgb(scheme.inverseOnSurface),
    inversePrimary: hexFromArgb(scheme.inversePrimary),

    shadow: hexFromArgb(scheme.shadow),
    scrim: hexFromArgb(scheme.scrim),
  };
}

/**
 * Generate M3 theme from a source color
 *
 * @param sourceColorHex - Source color in hex format (e.g., '#4CAF50')
 * @returns Complete theme with light and dark color schemes
 *
 * @example
 * ```tsx
 * const theme = generateThemeFromColor('#4CAF50');
 * console.log(theme.light.primary); // '#006e1c'
 * console.log(theme.dark.primary); // '#6fdd77'
 * ```
 */
export function generateThemeFromColor(sourceColorHex: string): Theme {
  // Convert hex to HCT color
  const sourceHct = Hct.fromInt(argbFromHex(sourceColorHex));

  // Generate light and dark schemes using SchemeTonalSpot
  const lightScheme = new SchemeTonalSpot(sourceHct, false, 0.0);
  const darkScheme = new SchemeTonalSpot(sourceHct, true, 0.0);

  return {
    light: schemeToColorScheme(lightScheme),
    dark: schemeToColorScheme(darkScheme),
    sourceColor: sourceColorHex,
  };
}

/**
 * Generate tonal palette from a source color
 *
 * @param sourceColorHex - Source color in hex format
 * @returns Tonal palette with tones from 0 to 100
 *
 * @example
 * ```tsx
 * const palette = generateTonalPalette('#4CAF50');
 * console.log(palette.tone(50)); // Medium tone
 * console.log(palette.tone(90)); // Light tone
 * ```
 */
export function generateTonalPalette(sourceColorHex: string): TonalPalette {
  const argb = argbFromHex(sourceColorHex);
  return TonalPalette.fromInt(argb);
}

/**
 * Convert hex color to ARGB integer
 *
 * @param hex - Color in hex format (e.g., '#4CAF50')
 * @returns ARGB integer representation
 *
 * @example
 * ```tsx
 * const argb = hexToArgb('#4CAF50');
 * ```
 */
export function hexToArgb(hex: string): number {
  return argbFromHex(hex);
}

/**
 * Convert ARGB integer to hex color
 *
 * @param argb - ARGB integer
 * @returns Color in hex format (e.g., '#4CAF50')
 *
 * @example
 * ```tsx
 * const hex = argbToHex(4283215696);
 * console.log(hex); // '#4CAF50'
 * ```
 */
export function argbToHex(argb: number): string {
  return hexFromArgb(argb);
}

/**
 * Apply color scheme to CSS custom properties
 *
 * @param scheme - Color scheme to apply
 * @param isDark - Whether this is a dark theme
 *
 * @example
 * ```tsx
 * const theme = generateThemeFromColor('#4CAF50');
 * applyColorScheme(theme.light, false);
 * ```
 */
export function applyColorScheme(scheme: ColorScheme, isDark: boolean): void {
  const root = document.documentElement;
  const prefix = '--md-sys-color';

  // Apply all colors as CSS custom properties
  Object.entries(scheme).forEach(([key, value]) => {
    // Convert camelCase to kebab-case
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`${prefix}-${cssKey}`, value);
  });

  // Set theme mode attribute
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

/**
 * Get current theme's color scheme
 *
 * @param theme - Complete theme object
 * @param isDark - Whether dark mode is active
 * @returns Current color scheme
 */
export function getCurrentScheme(theme: Theme, isDark: boolean): ColorScheme {
  return isDark ? theme.dark : theme.light;
}
