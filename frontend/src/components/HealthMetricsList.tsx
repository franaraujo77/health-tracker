/**
 * Health Metrics List Component
 * Demonstrates React Query usage for data fetching
 */
import { useHealthMetrics } from '../hooks/useHealthMetrics';

export function HealthMetricsList() {
  const { data, isLoading, error, refetch } = useHealthMetrics();

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading health metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          margin: '20px',
        }}
      >
        <strong>Error:</strong> {error.message}
        <button
          onClick={() => refetch()}
          style={{
            marginLeft: '10px',
            padding: '5px 10px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h3>Health Metrics ({data?.total || 0})</h3>
        <button
          onClick={() => refetch()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      {data?.data && data.data.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data.data.map((metric) => (
            <div
              key={metric.id}
              style={{
                padding: '15px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                backgroundColor: '#fafafa',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <strong style={{ textTransform: 'capitalize' }}>
                  {metric.metricType.replace('_', ' ')}
                </strong>
                <span style={{ color: '#666' }}>
                  {new Date(metric.recordedAt).toLocaleDateString()}
                </span>
              </div>
              <div style={{ fontSize: '24px', color: '#1976d2' }}>
                {metric.value} <span style={{ fontSize: '16px' }}>{metric.unit}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            color: '#666',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
          }}
        >
          No health metrics found. Start tracking your health data!
        </div>
      )}
    </div>
  );
}
