/**
 * Optimized Material Symbols Icon Component
 *
 * Uses inline SVG paths instead of loading the entire 3.7MB icon font.
 * Only includes icons actually used in the application.
 *
 * @packageDocumentation
 */

import './Icon.css';

/**
 * Icon weight options (100-700)
 */
export type IconWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700;

/**
 * Icon grade options (-50 to 200)
 */
export type IconGrade = -50 | -25 | 0 | 25 | 50 | 75 | 100 | 125 | 150 | 175 | 200;

/**
 * Icon optical size options (20-48px)
 */
export type IconOpticalSize = 20 | 24 | 28 | 32 | 36 | 40 | 48;

/**
 * Available icon names (only icons actually used in the app)
 */
export type IconName = 'light_mode' | 'dark_mode' | 'computer';

/**
 * Icon component props
 */
export interface IconProps {
  /**
   * The name of the Material Symbol icon
   */
  name: IconName;

  /**
   * Whether the icon should be filled (solid) or outlined
   * @default false (outlined)
   */
  filled?: boolean;

  /**
   * Icon weight (thickness of strokes) - currently not implemented for SVG
   * @default 400 (regular)
   */
  weight?: IconWeight;

  /**
   * Icon grade (visual weight adjustment) - currently not implemented for SVG
   * @default 0 (normal)
   */
  grade?: IconGrade;

  /**
   * Optical size optimization - currently not implemented for SVG
   * @default 24
   */
  opticalSize?: IconOpticalSize;

  /**
   * Icon size in pixels (applies to both width and height)
   * @default 24
   */
  size?: number;

  /**
   * Optional CSS class name
   */
  className?: string;

  /**
   * Optional inline styles
   */
  style?: React.CSSProperties;

  /**
   * Accessible label for screen readers
   */
  'aria-label'?: string;

  /**
   * Optional title for tooltip
   */
  title?: string;
}

/**
 * SVG path data for each icon (Material Symbols outlined, 24x24 viewBox)
 * Only includes icons actually used in the application to minimize bundle size
 */
const ICON_PATHS: Record<IconName, string> = {
  light_mode:
    'M12 17.5c-3.04 0-5.5-2.46-5.5-5.5s2.46-5.5 5.5-5.5 5.5 2.46 5.5 5.5-2.46 5.5-5.5 5.5zM12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z',
  dark_mode:
    'M9.37 5.51c-.18.64-.27 1.31-.27 1.99 0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27C17.45 17.19 14.93 19 12 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z',
  computer:
    'M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z',
};

/**
 * Optimized Material Symbols Icon Component
 *
 * Renders icons using inline SVG instead of loading a 3.7MB font file.
 * Only supports icons actually used in the application.
 *
 * @example
 * ```tsx
 * <Icon name="light_mode" />
 * <Icon name="dark_mode" size={32} />
 * <Icon name="computer" aria-label="System theme" />
 * ```
 */
export function Icon({
  name,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  filled: _filled = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  weight: _weight = 400,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  grade: _grade = 0,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  opticalSize: _opticalSize = 24,
  size = 24,
  className = '',
  style = {},
  'aria-label': ariaLabel,
  title,
}: IconProps) {
  const pathData = ICON_PATHS[name];

  if (!pathData) {
    console.warn(`Icon "${name}" not found. Available icons:`, Object.keys(ICON_PATHS));
    return null;
  }

  const combinedStyle: React.CSSProperties = {
    display: 'inline-block',
    width: `${size}px`,
    height: `${size}px`,
    fill: 'currentColor',
    ...style,
  };

  // If no aria-label is provided, mark as decorative
  const ariaHidden = !ariaLabel;

  return (
    <svg
      className={`md-icon ${className}`}
      style={combinedStyle}
      viewBox="0 0 24 24"
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title && <title>{title}</title>}
      <path d={pathData} />
    </svg>
  );
}

/**
 * Preset icon variants for common use cases
 */

/**
 * Filled icon variant (SVG implementation doesn't differentiate)
 */
export function FilledIcon(props: Omit<IconProps, 'filled'>) {
  return <Icon {...props} filled />;
}

/**
 * Outlined icon variant (default)
 */
export function OutlinedIcon(props: Omit<IconProps, 'filled'>) {
  return <Icon {...props} filled={false} />;
}

export default Icon;
