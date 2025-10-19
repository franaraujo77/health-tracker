/**
 * Web Vitals Tracking
 *
 * Tracks Core Web Vitals metrics (LCP, INP, CLS, TTFB) and reports them
 * to console in development and to analytics in production.
 *
 * Core Web Vitals:
 * - LCP (Largest Contentful Paint): <2.5s (Good), 2.5-4s (Needs Improvement), >4s (Poor)
 * - INP (Interaction to Next Paint): <200ms (Good), 200-500ms (Needs Improvement), >500ms (Poor)
 * - CLS (Cumulative Layout Shift): <0.1 (Good), 0.1-0.25 (Needs Improvement), >0.25 (Poor)
 * - TTFB (Time to First Byte): <800ms (Good), 800-1800ms (Needs Improvement), >1800ms (Poor)
 *
 * @packageDocumentation
 */

import { onCLS, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

/**
 * Analytics endpoint for production metric reporting
 * In production, replace with your actual analytics endpoint
 */
const ANALYTICS_ENDPOINT = '/api/analytics/web-vitals';

/**
 * Determine metric rating based on thresholds
 */
function getMetricRating(metric: Metric): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    INP: { good: 200, poor: 500 },
    CLS: { good: 0.1, poor: 0.25 },
    TTFB: { good: 800, poor: 1800 },
  };

  const threshold = thresholds[metric.name as keyof typeof thresholds];
  if (!threshold) return 'good';

  if (metric.value <= threshold.good) return 'good';
  if (metric.value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Format metric value with appropriate units
 */
function formatMetricValue(metric: Metric): string {
  // CLS is unitless
  if (metric.name === 'CLS') {
    return metric.value.toFixed(3);
  }
  // All others are in milliseconds
  return `${Math.round(metric.value)}ms`;
}

/**
 * Log metric to console in development
 */
function logMetricToConsole(metric: Metric): void {
  if (import.meta.env.DEV) {
    const rating = getMetricRating(metric);
    const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
    const value = formatMetricValue(metric);

    console.log(`${emoji} [Web Vitals] ${metric.name}: ${value} (${rating})`, '\nMetric Details:', {
      id: metric.id,
      value: metric.value,
      rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
    });
  }
}

/**
 * Send metric to analytics endpoint in production
 */
function sendMetricToAnalytics(metric: Metric): void {
  if (import.meta.env.PROD) {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: getMetricRating(metric),
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      // Additional context
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    });

    // Use sendBeacon if available for reliability (survives page unload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ANALYTICS_ENDPOINT, body);
    } else {
      // Fallback to fetch with keepalive
      fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch((error) => {
        console.error('Failed to send Web Vitals metric:', error);
      });
    }
  }
}

/**
 * Handle metric report
 */
function handleMetric(metric: Metric): void {
  logMetricToConsole(metric);
  sendMetricToAnalytics(metric);
}

/**
 * Initialize Web Vitals tracking
 *
 * Call this function once when your application loads to start
 * tracking Core Web Vitals metrics.
 *
 * @example
 * ```tsx
 * // In main.tsx
 * import { initWebVitals } from './utils/webVitals';
 *
 * // After app mounts
 * initWebVitals();
 * ```
 */
export function initWebVitals(): void {
  // Track all Core Web Vitals
  onLCP(handleMetric);
  onINP(handleMetric);
  onCLS(handleMetric);
  onTTFB(handleMetric);

  if (import.meta.env.DEV) {
    console.log('📊 Web Vitals tracking initialized');
  }
}

/**
 * Export metric types for external use
 */
export type { Metric } from 'web-vitals';
