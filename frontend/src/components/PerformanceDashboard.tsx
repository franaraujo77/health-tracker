/**
 * Performance Dashboard Component
 *
 * Displays Web Vitals metrics collected from the application.
 * Shows recent performance data with trend indicators and threshold checks.
 *
 * @packageDocumentation
 */

import { useEffect, useState } from 'react';
import type { Metric } from '../utils/webVitals';
import './PerformanceDashboard.css';

/**
 * Stored metric with timestamp
 */
interface StoredMetric extends Metric {
  timestamp: number;
  url: string;
}

/**
 * Metric summary for display
 */
interface MetricSummary {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  unit: string;
  threshold: { good: number; poor: number };
  count: number;
}

/**
 * Get metric rating based on thresholds
 */
function getMetricRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, { good: number; poor: number }> = {
    LCP: { good: 2500, poor: 4000 },
    INP: { good: 200, poor: 500 },
    CLS: { good: 0.1, poor: 0.25 },
    TTFB: { good: 800, poor: 1800 },
  };

  const threshold = thresholds[name];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Format metric value with appropriate units
 */
function formatMetricValue(name: string, value: number): string {
  // CLS is unitless
  if (name === 'CLS') {
    return value.toFixed(3);
  }
  // All others are in milliseconds
  return `${Math.round(value)}ms`;
}

/**
 * Performance Dashboard Component
 *
 * Displays aggregated Web Vitals metrics from localStorage.
 * In a production environment, this would fetch from an analytics API.
 */
export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<StoredMetric[]>([]);
  const [summary, setSummary] = useState<MetricSummary[]>([]);

  useEffect(() => {
    // In development, read from localStorage where web-vitals stores data
    // In production, this would fetch from /api/analytics/web-vitals
    const loadMetrics = () => {
      try {
        const stored = localStorage.getItem('web-vitals-metrics');
        if (stored) {
          const parsed = JSON.parse(stored) as StoredMetric[];
          setMetrics(parsed);

          // Aggregate metrics by type
          const aggregated = new Map<string, MetricSummary>();

          parsed.forEach((metric) => {
            const existing = aggregated.get(metric.name);
            const rating = getMetricRating(metric.name, metric.value);

            if (existing) {
              // Update with latest value
              existing.value = metric.value;
              existing.rating = rating;
              existing.count += 1;
            } else {
              const thresholds: Record<string, { good: number; poor: number }> = {
                LCP: { good: 2500, poor: 4000 },
                INP: { good: 200, poor: 500 },
                CLS: { good: 0.1, poor: 0.25 },
                TTFB: { good: 800, poor: 1800 },
              };

              aggregated.set(metric.name, {
                name: metric.name,
                value: metric.value,
                rating,
                unit: metric.name === 'CLS' ? '' : 'ms',
                threshold: thresholds[metric.name] || { good: 0, poor: 0 },
                count: 1,
              });
            }
          });

          setSummary(Array.from(aggregated.values()));
        }
      } catch (error) {
        console.error('Failed to load metrics:', error);
      }
    };

    loadMetrics();

    // Refresh metrics every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  // Store metrics in localStorage (simulating analytics collection)
  useEffect(() => {
    const handleMetric = (event: CustomEvent<StoredMetric>) => {
      const metric = event.detail;
      setMetrics((prev) => {
        const updated = [...prev, metric];
        // Keep only last 100 metrics
        const trimmed = updated.slice(-100);
        localStorage.setItem('web-vitals-metrics', JSON.stringify(trimmed));
        return trimmed;
      });
    };

    window.addEventListener('web-vitals-metric' as any, handleMetric as EventListener);
    return () => {
      window.removeEventListener('web-vitals-metric' as any, handleMetric as EventListener);
    };
  }, []);

  if (summary.length === 0) {
    return (
      <div className="performance-dashboard">
        <h2>📊 Performance Dashboard</h2>
        <p className="no-data">
          No performance metrics collected yet. Navigate around the app to collect Web Vitals data.
        </p>
      </div>
    );
  }

  return (
    <div className="performance-dashboard">
      <h2>📊 Performance Dashboard</h2>
      <p className="dashboard-description">
        Real-time Web Vitals metrics from your browsing session. Data collected: {metrics.length}{' '}
        samples
      </p>

      <div className="metrics-grid">
        {summary.map((metric) => {
          const emoji =
            metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';

          return (
            <div key={metric.name} className={`metric-card metric-${metric.rating}`}>
              <div className="metric-header">
                <span className="metric-emoji">{emoji}</span>
                <h3 className="metric-name">{metric.name}</h3>
              </div>

              <div className="metric-value">{formatMetricValue(metric.name, metric.value)}</div>

              <div className="metric-info">
                <div className="metric-rating">{metric.rating.replace('-', ' ')}</div>
                <div className="metric-threshold">
                  Good: {formatMetricValue(metric.name, metric.threshold.good)}
                </div>
                <div className="metric-samples">{metric.count} samples</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-info">
        <h3>About Web Vitals</h3>
        <ul>
          <li>
            <strong>LCP (Largest Contentful Paint):</strong> Measures loading performance. Good:{' '}
            {'<'}2.5s
          </li>
          <li>
            <strong>INP (Interaction to Next Paint):</strong> Measures interactivity. Good: {'<'}
            200ms
          </li>
          <li>
            <strong>CLS (Cumulative Layout Shift):</strong> Measures visual stability. Good: {'<'}
            0.1
          </li>
          <li>
            <strong>TTFB (Time to First Byte):</strong> Measures server responsiveness. Good: {'<'}
            800ms
          </li>
        </ul>
      </div>

      <div className="dashboard-actions">
        <button
          onClick={() => {
            localStorage.removeItem('web-vitals-metrics');
            setMetrics([]);
            setSummary([]);
          }}
          className="clear-button"
        >
          Clear Metrics
        </button>
      </div>
    </div>
  );
}
