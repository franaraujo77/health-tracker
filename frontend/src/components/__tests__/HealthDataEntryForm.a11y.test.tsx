/**
 * Accessibility Tests for HealthDataEntryForm Component
 * Tests WCAG 2.1 Level AA compliance using axe-core
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HealthDataEntryForm } from '../HealthDataEntryForm';
import { runAxe } from '../../tests/accessibility/axe.setup';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a test query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Wrapper component with required providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('HealthDataEntryForm - Accessibility', () => {
  it('should have no accessibility violations in default state', async () => {
    const { container } = render(<HealthDataEntryForm />, {
      wrapper: TestWrapper,
    });

    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible form labels', async () => {
    const { getByLabelText } = render(<HealthDataEntryForm />, {
      wrapper: TestWrapper,
    });

    // All form inputs should have accessible labels
    expect(getByLabelText(/metric type/i)).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', async () => {
    const { container } = render(<HealthDataEntryForm />, {
      wrapper: TestWrapper,
    });

    // Check for proper ARIA roles and attributes
    const form = container.querySelector('.health-data-entry-form');
    expect(form).toBeInTheDocument();

    const results = await runAxe(container, {
      rules: {
        'aria-allowed-attr': { enabled: true },
        'aria-required-attr': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('should have adequate color contrast', async () => {
    const { container } = render(<HealthDataEntryForm />, {
      wrapper: TestWrapper,
    });

    const results = await runAxe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('should have keyboard accessible select', async () => {
    const { getByRole } = render(<HealthDataEntryForm />, {
      wrapper: TestWrapper,
    });

    // Select dropdown should be keyboard accessible
    const select = getByRole('combobox');
    expect(select).toBeInTheDocument();
    // Should not have negative tabindex
    expect(select.getAttribute('tabindex')).not.toBe('-1');
  });

  it('should meet touch target size requirements (48x48px)', async () => {
    const { container } = render(<HealthDataEntryForm />, {
      wrapper: TestWrapper,
    });

    const results = await runAxe(container, {
      rules: {
        'target-size': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });
});
