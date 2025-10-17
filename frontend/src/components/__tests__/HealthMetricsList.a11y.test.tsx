/**
 * Accessibility Tests for HealthMetricsList Component
 * Tests WCAG 2.1 Level AA compliance using axe-core
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { HealthMetricsList } from '../HealthMetricsList';
import { runAxe } from '../../tests/accessibility/axe.setup';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the useHealthMetrics hook
vi.mock('../../hooks/useHealthMetrics', () => ({
  useHealthMetrics: () => ({
    data: {
      data: [
        {
          id: 1,
          metricType: 'weight',
          value: 70.5,
          unit: 'kg',
          recordedAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 2,
          metricType: 'blood_pressure',
          value: 120,
          unit: 'mmHg',
          recordedAt: '2024-01-15T10:00:00Z',
        },
      ],
      total: 2,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

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

describe('HealthMetricsList - Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<HealthMetricsList />, {
      wrapper: TestWrapper,
    });

    const results = await runAxe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper heading structure', async () => {
    const { getByRole } = render(<HealthMetricsList />, {
      wrapper: TestWrapper,
    });

    // Should have a heading for the list title
    const heading = getByRole('heading', { name: /health metrics/i });
    expect(heading).toBeInTheDocument();
  });

  it('should have accessible buttons', async () => {
    const { getByRole } = render(<HealthMetricsList />, {
      wrapper: TestWrapper,
    });

    // Refresh button should be accessible
    const refreshButton = getByRole('button', { name: /refresh/i });
    expect(refreshButton).toBeInTheDocument();
  });

  it('should have adequate color contrast for metric cards', async () => {
    const { container } = render(<HealthMetricsList />, {
      wrapper: TestWrapper,
    });

    const results = await runAxe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });

    expect(results).toHaveNoViolations();
  });

  it('should meet touch target size for interactive elements', async () => {
    const { container } = render(<HealthMetricsList />, {
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
