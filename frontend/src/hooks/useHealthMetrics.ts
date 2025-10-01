/**
 * React Query hooks for health metrics API operations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// apiClient will be used when replacing mock functions with real API calls
// @ts-expect-error - Placeholder for future API integration
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { apiClient } from '../lib/axios';
import type {
  HealthMetric,
  CreateHealthMetricRequest,
  HealthMetricsResponse,
} from '../types/health-metrics';

/**
 * Query Keys for health metrics
 */
export const healthMetricsKeys = {
  all: ['health-metrics'] as const,
  lists: () => [...healthMetricsKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...healthMetricsKeys.lists(), filters] as const,
  details: () => [...healthMetricsKeys.all, 'detail'] as const,
  detail: (id: string) => [...healthMetricsKeys.details(), id] as const,
};

/**
 * Mock API function to fetch health metrics
 * In production, this will be replaced with:
 * const response = await apiClient.get<HealthMetricsResponse>('/health-metrics');
 * return response.data;
 */
const fetchHealthMetrics = async (): Promise<HealthMetricsResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Mock data
  const mockData: HealthMetric[] = [
    {
      id: '1',
      userId: 'user-1',
      metricType: 'weight',
      value: 75.5,
      unit: 'kg',
      recordedAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '2',
      userId: 'user-1',
      metricType: 'blood_pressure',
      value: 120,
      unit: 'mmHg',
      recordedAt: new Date(Date.now() - 172800000).toISOString(),
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: '3',
      userId: 'user-1',
      metricType: 'heart_rate',
      value: 72,
      unit: 'bpm',
      recordedAt: new Date(Date.now() - 259200000).toISOString(),
      createdAt: new Date(Date.now() - 259200000).toISOString(),
    },
  ];

  return {
    data: mockData,
    total: mockData.length,
  };
};

/**
 * Mock API function to create a health metric
 * In production, this will be replaced with:
 * const response = await apiClient.post<HealthMetric>('/health-metrics', data);
 * return response.data;
 */
const createHealthMetric = async (data: CreateHealthMetricRequest): Promise<HealthMetric> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simulate 10% failure rate
  if (Math.random() < 0.1) {
    throw new Error('Failed to create health metric');
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    userId: 'user-1',
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Hook to fetch all health metrics
 */
export function useHealthMetrics() {
  return useQuery({
    queryKey: healthMetricsKeys.lists(),
    queryFn: fetchHealthMetrics,
  });
}

/**
 * Hook to create a new health metric
 */
export function useCreateHealthMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createHealthMetric,
    onSuccess: () => {
      // Invalidate and refetch health metrics after successful creation
      queryClient.invalidateQueries({ queryKey: healthMetricsKeys.lists() });
    },
  });
}

/**
 * Example usage in a component:
 *
 * const { data, isLoading, error } = useHealthMetrics();
 * const createMetric = useCreateHealthMetric();
 *
 * // Fetch data
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * console.log(data.data); // Array of health metrics
 *
 * // Create new metric
 * createMetric.mutate({
 *   metricType: 'weight',
 *   value: 75.5,
 *   unit: 'kg',
 *   recordedAt: new Date().toISOString(),
 * });
 */
