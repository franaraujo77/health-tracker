/**
 * Axe-core Accessibility Testing Setup
 * Configures automated accessibility testing for Material Design 3 components
 *
 * This setup integrates axe-core with Vitest to automatically check for
 * WCAG 2.1 Level AA accessibility violations in component tests.
 *
 * @see https://github.com/dequelabs/axe-core
 * @see https://www.deque.com/axe/core-documentation/api-documentation/
 */

import { configureAxe } from 'jest-axe';

import type { AxeResults, Result } from 'axe-core';

/**
 * Configure axe-core with custom rules for M3 components
 *
 * Rules enabled:
 * - color-contrast: Ensures WCAG 2.1 Level AA contrast ratios
 * - keyboard: Verifies keyboard accessibility
 * - aria-*: Validates ARIA attributes
 * - wcag2aa: All WCAG 2.1 Level AA rules
 */
export const axe = configureAxe({
  rules: {
    // Enable strict color contrast checking (4.5:1 for text, 3:1 for UI)
    'color-contrast': { enabled: true },

    // Ensure all interactive elements are keyboard accessible
    'focus-order-semantics': { enabled: true },
    tabindex: { enabled: true },

    // Validate ARIA usage
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'aria-valid-attr': { enabled: true },

    // Ensure proper document structure
    'landmark-one-main': { enabled: true },
    'page-has-heading-one': { enabled: false }, // Not applicable for components
    region: { enabled: true },

    // Form accessibility
    label: { enabled: true },
    'label-title-only': { enabled: true },

    // Image accessibility
    'image-alt': { enabled: true },

    // Touch target size (48x48px minimum)
    'target-size': { enabled: true },
  },

  // Run all WCAG 2.1 Level AA rules
  runOnly: {
    type: 'tag',
    values: ['wcag2aa', 'wcag21aa', 'best-practice'],
  },
});

/**
 * Custom axe configuration for specific test scenarios
 */
export const axeConfig = {
  /**
   * Standard configuration for component testing
   */
  component: {
    rules: {
      // Component-specific rule adjustments
      region: { enabled: false }, // Components may not have landmark regions
      'landmark-one-main': { enabled: false }, // Not applicable for components
    },
  },

  /**
   * Configuration for modal/dialog testing
   */
  modal: {
    rules: {
      'focus-trap': { enabled: true },
      'aria-modal': { enabled: true },
    },
  },

  /**
   * Configuration for form testing
   */
  form: {
    rules: {
      label: { enabled: true },
      'label-content-name-mismatch': { enabled: true },
      'autocomplete-valid': { enabled: true },
    },
  },
};

/**
 * Helper function to run axe tests on a component
 *
 * @example
 * ```typescript
 * import { runAxe } from '@/tests/accessibility/axe.setup';
 *
 * test('should have no accessibility violations', async () => {
 *   const { container } = render(<MyComponent />);
 *   const results = await runAxe(container);
 *   expect(results).toHaveNoViolations();
 * });
 * ```
 */
export async function runAxe(container: HTMLElement, config?: Parameters<typeof axe>[1]) {
  return await axe(container, config);
}

/**
 * Helper to get a summary of accessibility violations
 */
export function getViolationSummary(results: AxeResults): string {
  if (results.violations.length === 0) {
    return '✓ No accessibility violations found';
  }

  return results.violations
    .map((violation: Result) => {
      const nodes = violation.nodes.length;
      return `• ${violation.id}: ${violation.help} (${nodes} instance${nodes > 1 ? 's' : ''})`;
    })
    .join('\n');
}
