/**
 * Tests for HealthMetricsList component
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { HealthMetricsList } from './HealthMetricsList';
import * as hooks from '../hooks/useHealthMetrics';
import type { HealthMetricsResponse } from '../types/health-metrics';

describe('HealthMetricsList', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('renders loading state', () => {
    vi.spyOn(hooks, 'useHealthMetrics').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as UseQueryResult<HealthMetricsResponse>);

    render(<HealthMetricsList />, { wrapper: createWrapper() });

    expect(screen.getByText(/loading health metrics/i)).toBeInTheDocument();
  });

  it('renders error state with retry button', () => {
    const mockRefetch = vi.fn();
    vi.spyOn(hooks, 'useHealthMetrics').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
      refetch: mockRefetch,
    } as UseQueryResult<HealthMetricsResponse>);

    render(<HealthMetricsList />, { wrapper: createWrapper() });

    expect(screen.getByText(/error:/i)).toBeInTheDocument();
    expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('renders empty state when no metrics', () => {
    vi.spyOn(hooks, 'useHealthMetrics').mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as UseQueryResult<HealthMetricsResponse>);

    render(<HealthMetricsList />, { wrapper: createWrapper() });

    expect(screen.getByText(/no health metrics found/i)).toBeInTheDocument();
    expect(screen.getByText(/start tracking your health data/i)).toBeInTheDocument();
  });

  it('renders metrics list with data', () => {
    vi.spyOn(hooks, 'useHealthMetrics').mockReturnValue({
      data: {
        data: [
          {
            id: '1',
            userId: 'user-1',
            metricType: 'weight',
            value: 75.5,
            unit: 'kg',
            recordedAt: new Date('2024-01-01').toISOString(),
          },
          {
            id: '2',
            userId: 'user-1',
            metricType: 'blood_pressure',
            value: 120,
            unit: 'mmHg',
            recordedAt: new Date('2024-01-02').toISOString(),
          },
        ],
        total: 2,
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as UseQueryResult<HealthMetricsResponse>);

    render(<HealthMetricsList />, { wrapper: createWrapper() });

    expect(screen.getByText(/health metrics \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/weight/i)).toBeInTheDocument();
    expect(screen.getByText('75.5')).toBeInTheDocument();
    expect(screen.getByText(/blood pressure/i)).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('renders refresh button', () => {
    vi.spyOn(hooks, 'useHealthMetrics').mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as UseQueryResult<HealthMetricsResponse>);

    render(<HealthMetricsList />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });
});
