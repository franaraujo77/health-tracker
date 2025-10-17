/**
 * Accessibility Tests for ThemeToggle Component
 * Tests WCAG 2.1 Level AA compliance using axe-core
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeToggle } from '../ThemeToggle';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { runAxe } from '../../tests/accessibility/axe.setup';

// Wrapper with ThemeProvider
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('ThemeToggle - Accessibility', () => {
  it('should have no accessibility violations in icon button variant', async () => {
    const { container } = render(<ThemeToggle variant="icon-button" />, {
      wrapper: TestWrapper,
    });

    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations in segmented button variant', async () => {
    const { container } = render(<ThemeToggle variant="segmented" />, {
      wrapper: TestWrapper,
    });

    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible button labels', async () => {
    const { getByRole } = render(<ThemeToggle variant="icon-button" />, {
      wrapper: TestWrapper,
    });

    const toggleButton = getByRole('button');
    expect(toggleButton).toBeInTheDocument();

    // Button should have accessible name
    expect(toggleButton).toHaveAccessibleName();
  });

  it('should have proper ARIA attributes for toggle state', async () => {
    const { getByRole } = render(<ThemeToggle variant="icon-button" />, {
      wrapper: TestWrapper,
    });

    const toggleButton = getByRole('button');

    // Should indicate current state
    expect(toggleButton.getAttribute('aria-label')).toBeTruthy();
  });

  it('should have adequate color contrast', async () => {
    const { container } = render(<ThemeToggle variant="segmented" />, {
      wrapper: TestWrapper,
    });

    const results = await runAxe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('should meet touch target size requirements', async () => {
    const { container } = render(<ThemeToggle variant="icon-button" />, {
      wrapper: TestWrapper,
    });

    const results = await runAxe(container, {
      rules: {
        'target-size': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('should be keyboard accessible', async () => {
    const { getAllByRole } = render(<ThemeToggle variant="segmented" />, {
      wrapper: TestWrapper,
    });

    const radioButtons = getAllByRole('radio');

    // All radio buttons should be keyboard accessible
    radioButtons.forEach((button) => {
      expect(button).toBeInTheDocument();
      expect(button.getAttribute('tabindex')).not.toBe('-1');
    });
  });
});
