/**
 * Material Design 3 Elevation Utilities
 *
 * Provides utilities for M3 elevation system with surface tints.
 * Combines shadows with color overlays for depth perception.
 *
 * @packageDocumentation
 */

import { tokens } from './tokens';

/**
 * M3 Elevation levels (0-5)
 */
export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Elevation configuration for a specific level
 */
export interface ElevationConfig {
  /** Box shadow for the elevation */
  shadow: string;
  /** Surface tint opacity for light mode */
  tintOpacity: number;
  /** Z-index for stacking context */
  zIndex: number;
}

/**
 * M3 elevation configurations
 *
 * Shadows are based on M3 specifications:
 * - Level 0: No shadow (on-surface elements)
 * - Level 1: 0dp-1dp elevation (cards, chips)
 * - Level 2: 3dp-6dp elevation (FABs, buttons)
 * - Level 3: 6dp-8dp elevation (dialogs, modals)
 * - Level 4: 8dp-12dp elevation (navigation drawer)
 * - Level 5: 12dp+ elevation (app bar, top-level surfaces)
 */
const ELEVATION_CONFIGS: Record<ElevationLevel, ElevationConfig> = {
  0: {
    shadow: 'none',
    tintOpacity: 0,
    zIndex: 0,
  },
  1: {
    shadow: '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
    tintOpacity: 0.05,
    zIndex: 1,
  },
  2: {
    shadow: '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
    tintOpacity: 0.08,
    zIndex: 2,
  },
  3: {
    shadow: '0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px 0px rgba(0, 0, 0, 0.3)',
    tintOpacity: 0.11,
    zIndex: 3,
  },
  4: {
    shadow: '0px 6px 10px 4px rgba(0, 0, 0, 0.15), 0px 2px 3px 0px rgba(0, 0, 0, 0.3)',
    tintOpacity: 0.12,
    zIndex: 4,
  },
  5: {
    shadow: '0px 8px 12px 6px rgba(0, 0, 0, 0.15), 0px 4px 4px 0px rgba(0, 0, 0, 0.3)',
    tintOpacity: 0.14,
    zIndex: 5,
  },
};

/**
 * Get elevation configuration for a level
 *
 * @param level - Elevation level (0-5)
 * @returns Elevation configuration
 *
 * @example
 * ```tsx
 * const config = getElevationConfig(2);
 * console.log(config.shadow); // Shadow CSS value
 * console.log(config.tintOpacity); // 0.08
 * ```
 */
export function getElevationConfig(level: ElevationLevel): ElevationConfig {
  return ELEVATION_CONFIGS[level];
}

/**
 * Get elevation shadow CSS value
 *
 * @param level - Elevation level (0-5)
 * @returns CSS box-shadow value
 *
 * @example
 * ```tsx
 * const cardStyle = {
 *   boxShadow: getElevationShadow(1),
 * };
 * ```
 */
export function getElevationShadow(level: ElevationLevel): string {
  return tokens.elevation.shadow(level);
}

/**
 * Get elevation surface tint styles
 *
 * Creates a CSS object for surface tint overlay.
 * In M3, elevated surfaces receive a primary color tint in light mode
 * and become lighter in dark mode.
 *
 * @param level - Elevation level (0-5)
 * @returns CSS properties for surface tint
 *
 * @example
 * ```tsx
 * const Card = ({ children }) => (
 *   <div style={{
 *     position: 'relative',
 *     backgroundColor: tokens.color.get('surface'),
 *     ...getElevationTint(2),
 *   }}>
 *     {children}
 *   </div>
 * );
 * ```
 */
export function getElevationTint(level: ElevationLevel): React.CSSProperties {
  if (level === 0) {
    return {};
  }

  return {
    position: 'relative' as const,
    '::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: tokens.color.get('primary'),
      opacity: tokens.elevation.tint(level),
      pointerEvents: 'none',
      borderRadius: 'inherit',
    },
  } as React.CSSProperties;
}

/**
 * Get complete elevation styles (shadow + tint)
 *
 * @param level - Elevation level (0-5)
 * @returns Complete CSS properties for elevation
 *
 * @example
 * ```tsx
 * const cardStyle = getElevationStyles(1);
 * // Returns: { boxShadow: '...', position: 'relative', ... }
 * ```
 */
export function getElevationStyles(level: ElevationLevel): React.CSSProperties {
  const config = ELEVATION_CONFIGS[level];

  return {
    boxShadow: config.shadow,
    zIndex: config.zIndex,
    ...getElevationTint(level),
  };
}

/**
 * Create CSS class name for elevation level
 *
 * @param level - Elevation level (0-5)
 * @returns CSS class name
 *
 * @example
 * ```tsx
 * <div className={getElevationClassName(2)}>
 *   Elevated content
 * </div>
 * ```
 */
export function getElevationClassName(level: ElevationLevel): string {
  return `elevation-${level}`;
}

/**
 * Generate CSS variables for elevation system
 *
 * Call this once to inject elevation CSS variables into the document.
 * This is typically done during app initialization.
 *
 * @example
 * ```tsx
 * // In your app initialization
 * import { injectElevationStyles } from './styles/elevationUtils';
 *
 * injectElevationStyles();
 * ```
 */
export function injectElevationStyles(): void {
  if (typeof document === 'undefined') return;

  const styleId = 'md-elevation-styles';

  // Remove existing styles if present
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Generate CSS
  const css = `
    /* Material Design 3 Elevation Styles */
    ${Object.entries(ELEVATION_CONFIGS)
      .map(
        ([level, config]) => `
      .elevation-${level} {
        box-shadow: ${config.shadow};
        z-index: ${config.zIndex};
        position: relative;
      }

      .elevation-${level}::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: ${tokens.color.get('primary')};
        opacity: ${tokens.elevation.tint(Number(level) as ElevationLevel)};
        pointer-events: none;
        border-radius: inherit;
      }

      .elevation-${level}:where(:not([class*="elevation-"]::before)) {
        /* Ensure no tint for level 0 */
        ${level === '0' ? 'content: none;' : ''}
      }
    `
      )
      .join('\n')}

    /* Hover elevation transitions */
    .elevation-hover-1:hover { box-shadow: ${ELEVATION_CONFIGS[1].shadow}; }
    .elevation-hover-2:hover { box-shadow: ${ELEVATION_CONFIGS[2].shadow}; }
    .elevation-hover-3:hover { box-shadow: ${ELEVATION_CONFIGS[3].shadow}; }
    .elevation-hover-4:hover { box-shadow: ${ELEVATION_CONFIGS[4].shadow}; }
    .elevation-hover-5:hover { box-shadow: ${ELEVATION_CONFIGS[5].shadow}; }
  `;

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
}

/**
 * React hook to use elevation styles
 *
 * @param level - Elevation level (0-5)
 * @param hover - Optional hover elevation level
 * @returns Object with elevation styles and class names
 *
 * @example
 * ```tsx
 * function Card() {
 *   const elevation = useElevation(1, 2);
 *
 *   return (
 *     <div className={elevation.className} style={elevation.style}>
 *       Card content
 *     </div>
 *   );
 * }
 * ```
 */
export function useElevation(
  level: ElevationLevel,
  hover?: ElevationLevel
): {
  style: React.CSSProperties;
  className: string;
} {
  const className = [
    getElevationClassName(level),
    hover !== undefined ? `elevation-hover-${hover}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    style: getElevationStyles(level),
    className,
  };
}
