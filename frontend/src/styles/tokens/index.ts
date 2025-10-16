/**
 * Material Design 3 Design Tokens
 * Centralized export for all M3 design token accessors
 *
 * This module provides type-safe programmatic access to all M3 design tokens
 * including colors, typography, spacing, elevation, shapes, and state layers.
 *
 * @packageDocumentation
 */

// Re-export all types and color utilities
export * from './types';
export * from './theme';

/**
 * Typography scale token names
 */
export type MDTypographyScale =
  | 'display-large'
  | 'display-medium'
  | 'display-small'
  | 'headline-large'
  | 'headline-medium'
  | 'headline-small'
  | 'title-large'
  | 'title-medium'
  | 'title-small'
  | 'body-large'
  | 'body-medium'
  | 'body-small'
  | 'label-large'
  | 'label-medium'
  | 'label-small';

/**
 * Typography properties
 */
export type MDTypographyProperty = 'font' | 'size' | 'line-height' | 'weight' | 'tracking';

/**
 * Spacing scale values (0-24)
 */
export type MDSpacingScale = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;

/**
 * Elevation levels (0-5)
 */
export type MDElevationLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Elevation properties
 */
export type MDElevationProperty = 'shadow' | 'tint-opacity' | 'z-index';

/**
 * Shape scale values
 */
export type MDShapeScale =
  | 'none'
  | 'extra-small'
  | 'small'
  | 'medium'
  | 'large'
  | 'extra-large'
  | 'full'
  | 'circle';

/**
 * State layer states
 */
export type MDStateLayer = 'hover' | 'focus' | 'pressed' | 'dragged';

/**
 * Disabled state types
 */
export type MDDisabledState = 'content' | 'container';

/**
 * Get typography token CSS custom property
 *
 * @param scale - Typography scale (e.g., 'display-large')
 * @param property - Typography property (e.g., 'font', 'size')
 * @returns CSS custom property string
 *
 * @example
 * ```tsx
 * const headingStyle = {
 *   fontFamily: getTypographyToken('headline-large', 'font'),
 *   fontSize: getTypographyToken('headline-large', 'size'),
 *   lineHeight: getTypographyToken('headline-large', 'line-height'),
 * };
 * ```
 */
export function getTypographyToken(
  scale: MDTypographyScale,
  property: MDTypographyProperty
): string {
  return `var(--md-sys-typescale-${scale}-${property})`;
}

/**
 * Get spacing token CSS custom property
 *
 * @param scale - Spacing scale value (0-24)
 * @returns CSS custom property string
 *
 * @example
 * ```tsx
 * const cardStyle = {
 *   padding: getSpacingToken(4), // 16px
 *   gap: getSpacingToken(2), // 8px
 * };
 * ```
 */
export function getSpacingToken(scale: MDSpacingScale): string {
  return `var(--md-sys-spacing-${scale})`;
}

/**
 * Get elevation token CSS custom property
 *
 * @param level - Elevation level (0-5)
 * @param property - Elevation property (shadow, tint-opacity, z-index)
 * @returns CSS custom property string
 *
 * @example
 * ```tsx
 * const cardStyle = {
 *   boxShadow: getElevationToken(2, 'shadow'),
 *   zIndex: getElevationToken(2, 'z-index'),
 * };
 * ```
 */
export function getElevationToken(level: MDElevationLevel, property: MDElevationProperty): string {
  return `var(--md-sys-elevation-${level}-${property})`;
}

/**
 * Get shape token CSS custom property
 *
 * @param scale - Shape scale value
 * @returns CSS custom property string
 *
 * @example
 * ```tsx
 * const buttonStyle = {
 *   borderRadius: getShapeToken('full'), // 9999px (pill shape)
 * };
 *
 * const avatarStyle = {
 *   borderRadius: getShapeToken('circle'), // 50%
 * };
 * ```
 */
export function getShapeToken(scale: MDShapeScale): string {
  return `var(--md-sys-shape-${scale})`;
}

/**
 * Get state layer opacity CSS custom property
 *
 * @param state - State layer type
 * @returns CSS custom property string
 *
 * @example
 * ```tsx
 * const hoverOpacity = getStateLayerToken('hover'); // 0.08
 * ```
 */
export function getStateLayerToken(state: MDStateLayer): string {
  return `var(--md-sys-state-${state}-opacity)`;
}

/**
 * Get disabled state opacity CSS custom property
 *
 * @param type - Disabled state type (content or container)
 * @returns CSS custom property string
 *
 * @example
 * ```tsx
 * const disabledButton = {
 *   opacity: getDisabledStateToken('content'), // 0.38
 * };
 * ```
 */
export function getDisabledStateToken(type: MDDisabledState): string {
  return `var(--md-sys-state-disabled-${type}-opacity)`;
}

/**
 * Token namespaces for organized access
 */
export const tokens = {
  /**
   * Color tokens
   */
  color: {
    /**
     * Get color token CSS custom property
     * @param token - Color token name
     */
    get: (token: import('./types').MDColorToken) => `var(--md-sys-color-${token})`,

    /**
     * Get raw color token name
     * @param token - Color token name
     */
    getName: (token: import('./types').MDColorToken) => `--md-sys-color-${token}`,
  },

  /**
   * Typography tokens
   */
  typography: {
    /**
     * Get typography token CSS custom property
     * @param scale - Typography scale
     * @param property - Typography property
     */
    get: (scale: MDTypographyScale, property: MDTypographyProperty) =>
      `var(--md-sys-typescale-${scale}-${property})`,

    /**
     * Get all typography properties for a scale
     * @param scale - Typography scale
     */
    getAll: (scale: MDTypographyScale) => ({
      fontFamily: `var(--md-sys-typescale-${scale}-font)`,
      fontSize: `var(--md-sys-typescale-${scale}-size)`,
      lineHeight: `var(--md-sys-typescale-${scale}-line-height)`,
      fontWeight: `var(--md-sys-typescale-${scale}-weight)`,
      letterSpacing: `var(--md-sys-typescale-${scale}-tracking)`,
    }),
  },

  /**
   * Spacing tokens
   */
  spacing: {
    /**
     * Get spacing token CSS custom property
     * @param scale - Spacing scale value
     */
    get: (scale: MDSpacingScale) => `var(--md-sys-spacing-${scale})`,
  },

  /**
   * Elevation tokens
   */
  elevation: {
    /**
     * Get elevation token CSS custom property
     * @param level - Elevation level
     * @param property - Elevation property
     */
    get: (level: MDElevationLevel, property: MDElevationProperty) =>
      `var(--md-sys-elevation-${level}-${property})`,

    /**
     * Get elevation shadow
     * @param level - Elevation level
     */
    shadow: (level: MDElevationLevel) => `var(--md-sys-elevation-${level}-shadow)`,

    /**
     * Get elevation tint opacity
     * @param level - Elevation level
     */
    tint: (level: MDElevationLevel) => `var(--md-sys-elevation-${level}-tint-opacity)`,
  },

  /**
   * Shape tokens
   */
  shape: {
    /**
     * Get shape token CSS custom property
     * @param scale - Shape scale value
     */
    get: (scale: MDShapeScale) => `var(--md-sys-shape-${scale})`,

    /**
     * Shape scale shortcuts
     */
    none: 'var(--md-sys-shape-none)',
    extraSmall: 'var(--md-sys-shape-extra-small)',
    small: 'var(--md-sys-shape-small)',
    medium: 'var(--md-sys-shape-medium)',
    large: 'var(--md-sys-shape-large)',
    extraLarge: 'var(--md-sys-shape-extra-large)',
    full: 'var(--md-sys-shape-full)',
    circle: 'var(--md-sys-shape-circle)',
  },

  /**
   * State layer tokens
   */
  state: {
    /**
     * Get state layer opacity
     * @param state - State layer type
     */
    get: (state: MDStateLayer) => `var(--md-sys-state-${state}-opacity)`,

    /**
     * State layer shortcuts
     */
    hover: 'var(--md-sys-state-hover-opacity)',
    focus: 'var(--md-sys-state-focus-opacity)',
    pressed: 'var(--md-sys-state-pressed-opacity)',
    dragged: 'var(--md-sys-state-dragged-opacity)',

    /**
     * Disabled state opacities
     */
    disabled: {
      content: 'var(--md-sys-state-disabled-content-opacity)',
      container: 'var(--md-sys-state-disabled-container-opacity)',
    },
  },
} as const;

/**
 * Component-specific token shortcuts
 */
export const components = {
  /**
   * Button tokens
   */
  button: {
    shape: 'var(--md-sys-shape-button)',
    paddingX: 'var(--md-sys-spacing-button-padding-x)',
    paddingY: 'var(--md-sys-spacing-button-padding-y)',
    gap: 'var(--md-sys-spacing-button-gap)',
  },

  /**
   * Card tokens
   */
  card: {
    shape: 'var(--md-sys-shape-card)',
    shapeLarge: 'var(--md-sys-shape-card-large)',
    padding: 'var(--md-sys-spacing-card-padding)',
    paddingLarge: 'var(--md-sys-spacing-card-padding-large)',
    gap: 'var(--md-sys-spacing-card-gap)',
    gapSmall: 'var(--md-sys-spacing-card-gap-small)',
    elevation: 'var(--md-sys-elevation-card)',
    elevationHover: 'var(--md-sys-elevation-card-hover)',
  },

  /**
   * Chip tokens
   */
  chip: {
    shape: 'var(--md-sys-shape-chip)',
    paddingX: 'var(--md-sys-spacing-chip-padding-x)',
    paddingY: 'var(--md-sys-spacing-chip-padding-y)',
    gap: 'var(--md-sys-spacing-chip-gap)',
    iconGap: 'var(--md-sys-spacing-chip-icon-gap)',
  },

  /**
   * Dialog tokens
   */
  dialog: {
    shape: 'var(--md-sys-shape-dialog)',
    padding: 'var(--md-sys-spacing-dialog-padding)',
    titleMargin: 'var(--md-sys-spacing-dialog-title-margin)',
    actionsGap: 'var(--md-sys-spacing-dialog-actions-gap)',
    elevation: 'var(--md-sys-elevation-dialog)',
  },

  /**
   * FAB tokens
   */
  fab: {
    shape: 'var(--md-sys-shape-fab)',
    shapeSmall: 'var(--md-sys-shape-fab-small)',
    shapeLarge: 'var(--md-sys-shape-fab-large)',
    elevation: 'var(--md-sys-elevation-fab)',
    elevationHover: 'var(--md-sys-elevation-fab-hover)',
    elevationPressed: 'var(--md-sys-elevation-fab-pressed)',
  },

  /**
   * List tokens
   */
  list: {
    itemPadding: 'var(--md-sys-spacing-list-item-padding)',
    itemGap: 'var(--md-sys-spacing-list-item-gap)',
    sectionGap: 'var(--md-sys-spacing-list-section-gap)',
  },

  /**
   * Form tokens
   */
  form: {
    fieldGap: 'var(--md-sys-spacing-form-field-gap)',
    labelMargin: 'var(--md-sys-spacing-form-label-margin)',
    sectionGap: 'var(--md-sys-spacing-form-section-gap)',
    inputPadding: 'var(--md-sys-spacing-form-input-padding)',
    textFieldShape: 'var(--md-sys-shape-text-field-outlined)',
    textFieldShapeFilled: 'var(--md-sys-shape-text-field-filled)',
  },

  /**
   * Navigation tokens
   */
  nav: {
    itemPadding: 'var(--md-sys-spacing-nav-item-padding)',
    itemGap: 'var(--md-sys-spacing-nav-item-gap)',
    sectionGap: 'var(--md-sys-spacing-nav-section-gap)',
    drawerShape: 'var(--md-sys-shape-nav-drawer)',
    drawerElevation: 'var(--md-sys-elevation-nav-drawer)',
  },

  /**
   * Page layout tokens
   */
  page: {
    paddingX: 'var(--md-sys-spacing-page-padding-x)',
    paddingY: 'var(--md-sys-spacing-page-padding-y)',
    sectionGap: 'var(--md-sys-spacing-page-section-gap)',
    maxWidth: 'var(--md-sys-spacing-page-max-width)',
  },

  /**
   * Grid tokens
   */
  grid: {
    gap: 'var(--md-sys-spacing-grid-gap)',
    gapSmall: 'var(--md-sys-spacing-grid-gap-small)',
    gapLarge: 'var(--md-sys-spacing-grid-gap-large)',
  },
} as const;

/**
 * Default export with all token namespaces
 */
export default {
  ...tokens,
  components,
};
