/**
 * Health Metrics List Component
 * Demonstrates React Query usage for data fetching
 * Material Design 3 implementation
 */
import { useHealthMetrics } from '../hooks/useHealthMetrics';
import './HealthMetricsList.css';

export function HealthMetricsList() {
  const { data, isLoading, error, refetch } = useHealthMetrics();

  if (isLoading) {
    return (
      <div className="health-metrics-loading">
        <p>Loading health metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="health-metrics-error">
        <strong>Error:</strong> {error.message}
        <button onClick={() => refetch()} className="health-metrics-error-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="health-metrics-list">
      <div className="health-metrics-header">
        <h3 className="health-metrics-title">Health Metrics ({data?.total || 0})</h3>
        <button onClick={() => refetch()} className="health-metrics-refresh-button">
          Refresh
        </button>
      </div>

      {data?.data && data.data.length > 0 ? (
        <div className="health-metrics-container">
          {data.data.map((metric) => (
            <div key={metric.id} className="health-metric-card">
              <div className="health-metric-card-header">
                <strong className="health-metric-type">
                  {metric.metricType.replace('_', ' ')}
                </strong>
                <span className="health-metric-date">
                  {new Date(metric.recordedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="health-metric-value">
                {metric.value} <span className="health-metric-unit">{metric.unit}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="health-metrics-empty">
          No health metrics found. Start tracking your health data!
        </div>
      )}
    </div>
  );
}
