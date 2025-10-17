/**
 * Material Symbols Icon Component
 *
 * A wrapper component for Material Symbols variable font icons.
 * Provides type-safe access to Material Design 3 icons with customizable properties.
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
 * Grade affects the icon's visual weight without changing its size
 */
export type IconGrade = -50 | -25 | 0 | 25 | 50 | 75 | 100 | 125 | 150 | 175 | 200;

/**
 * Icon optical size options (20-48px)
 */
export type IconOpticalSize = 20 | 24 | 28 | 32 | 36 | 40 | 48;

/**
 * Icon component props
 */
export interface IconProps {
  /**
   * The name of the Material Symbol icon
   * @example 'light_mode', 'dark_mode', 'computer', 'refresh', 'error'
   */
  name: string;

  /**
   * Whether the icon should be filled (solid) or outlined
   * @default false (outlined)
   */
  filled?: boolean;

  /**
   * Icon weight (thickness of strokes)
   * @default 400 (regular)
   */
  weight?: IconWeight;

  /**
   * Icon grade (visual weight adjustment)
   * @default 0 (normal)
   */
  grade?: IconGrade;

  /**
   * Optical size optimization for different icon sizes
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
   * If not provided, the icon is considered decorative (aria-hidden="true")
   */
  'aria-label'?: string;

  /**
   * Optional title for tooltip
   */
  title?: string;
}

/**
 * Material Symbols Icon Component
 *
 * Renders a Material Design 3 icon using the Material Symbols variable font.
 * Supports customization of fill, weight, grade, and optical size.
 *
 * @example
 * ```tsx
 * // Basic usage (outlined icon)
 * <Icon name="light_mode" />
 *
 * // Filled icon
 * <Icon name="favorite" filled />
 *
 * // Custom weight and size
 * <Icon name="search" weight={300} size={32} />
 *
 * // With accessibility label
 * <Icon name="close" aria-label="Close dialog" />
 *
 * // Custom styling
 * <Icon
 *   name="error"
 *   filled
 *   weight={500}
 *   className="error-icon"
 *   style={{ color: 'var(--md-sys-color-error)' }}
 *   aria-label="Error"
 * />
 * ```
 */
export function Icon({
  name,
  filled = false,
  weight = 400,
  grade = 0,
  opticalSize = 24,
  size = 24,
  className = '',
  style = {},
  'aria-label': ariaLabel,
  title,
}: IconProps) {
  const fontVariationSettings = `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`;

  const combinedStyle: React.CSSProperties = {
    fontSize: `${size}px`,
    width: `${size}px`,
    height: `${size}px`,
    fontVariationSettings,
    ...style,
  };

  // If no aria-label is provided, mark as decorative
  const ariaHidden = !ariaLabel;

  return (
    <span
      className={`material-symbols-outlined md-icon ${className}`}
      style={combinedStyle}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      title={title}
      role={ariaLabel ? 'img' : undefined}
    >
      {name}
    </span>
  );
}

/**
 * Preset icon variants for common use cases
 */

/**
 * Filled icon variant
 */
export function FilledIcon(props: Omit<IconProps, 'filled'>) {
  return <Icon {...props} filled />;
}

/**
 * Outlined icon variant (default, but explicit)
 */
export function OutlinedIcon(props: Omit<IconProps, 'filled'>) {
  return <Icon {...props} filled={false} />;
}

export default Icon;
