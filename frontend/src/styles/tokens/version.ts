/**
 * Design Tokens Version
 *
 * This file tracks the version of the M3 design token system.
 * Follow Semantic Versioning (https://semver.org)
 *
 * MAJOR.MINOR.PATCH
 * - MAJOR: Breaking changes (token removal/renaming)
 * - MINOR: New tokens, deprecations (backwards compatible)
 * - PATCH: Value adjustments, bug fixes
 */

export const TOKENS_VERSION = '1.0.0';

export const TOKENS_METADATA = {
  version: TOKENS_VERSION,
  generatedDate: '2025-10-17',
  seedColor: '#4CAF50',
  designSystem: 'Material Design 3',
  changelog: './CHANGELOG.md',
} as const;

/**
 * Get the current design tokens version
 *
 * @returns The current version string
 *
 * @example
 * ```tsx
 * import { getTokensVersion } from './styles/tokens/version';
 *
 * console.log(`Design Tokens v${getTokensVersion()}`);
 * ```
 */
export function getTokensVersion(): string {
  return TOKENS_VERSION;
}

/**
 * Check if a feature is available in the current token version
 *
 * @param minVersion - Minimum required version
 * @returns True if current version meets the requirement
 *
 * @example
 * ```tsx
 * if (isTokenVersionAtLeast('1.2.0')) {
 *   // Use new tokens introduced in v1.2.0
 * }
 * ```
 */
export function isTokenVersionAtLeast(minVersion: string): boolean {
  const [currentMajor, currentMinor, currentPatch] = TOKENS_VERSION.split('.').map(Number);
  const [minMajor, minMinor, minPatch] = minVersion.split('.').map(Number);

  if (currentMajor !== minMajor) return currentMajor > minMajor;
  if (currentMinor !== minMinor) return currentMinor > minMinor;
  return currentPatch >= minPatch;
}
