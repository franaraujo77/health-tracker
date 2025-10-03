/**
 * Type definitions for health metrics
 */

export interface HealthMetric {
  id: string;
  userId: string;
  metricType: string;
  value: number;
  unit: string;
  recordedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateHealthMetricRequest {
  metricType: string;
  value: number;
  unit: string;
  recordedAt: string;
}

export interface HealthMetricsResponse {
  data: HealthMetric[];
  total: number;
}
