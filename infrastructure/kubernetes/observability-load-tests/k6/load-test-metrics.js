// k6 Load Test: Prometheus Metrics Ingestion
// Tests metrics write performance via remote write API

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Custom metrics
const metricsWritten = new Counter('metrics_written');
const writeLatency = new Trend('write_latency_ms');

// Load test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 VUs
    { duration: '5m', target: 100 },   // Sustain 100 VUs
    { duration: '2m', target: 200 },   // Spike to 200 VUs
    { duration: '3m', target: 200 },   // Sustain spike
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // SLA requirements
    'http_req_duration{scenario:default}': ['p(95)<500'],  // 95% under 500ms
    'http_req_failed': ['rate<0.01'],                      // <1% failures
    'write_latency_ms': ['p(95)<300'],                     // Custom metric threshold
    'metrics_written': ['count>1000000'],                  // >1M metrics in test
  },
  tags: {
    test_type: 'metrics_ingestion',
    component: 'prometheus',
  },
};

// Test configuration
const BASE_URL = __ENV.PROMETHEUS_URL || 'http://prometheus:9090';
const REMOTE_WRITE_ENDPOINT = `${BASE_URL}/api/v1/write`;
const BATCH_SIZE = parseInt(__ENV.BATCH_SIZE) || 100;  // Metrics per request

// Generate realistic Prometheus metrics in remote write format
function generateMetricsPayload(batchSize) {
  const timestamp = Date.now();
  const metrics = [];

  for (let i = 0; i < batchSize; i++) {
    const metricName = `load_test_metric_${i % 10}`;  // 10 different metrics
    const labels = {
      job: 'k6-load-test',
      instance: `instance-${__VU}`,
      test_run: __ENV.TEST_RUN_ID || 'default',
      metric_type: ['counter', 'gauge', 'histogram'][i % 3],
    };

    metrics.push({
      name: metricName,
      labels: labels,
      value: Math.random() * 100,
      timestamp: timestamp + i,
    });
  }

  // Convert to Prometheus remote write protobuf format (simplified)
  // In production, use proper protobuf encoding
  return JSON.stringify({
    timeseries: metrics.map(m => ({
      labels: Object.entries(m.labels).map(([k, v]) => ({ name: k, value: v })),
      samples: [{ value: m.value, timestamp: m.timestamp }],
    })),
  });
}

// Main test function - executed by each VU
export default function () {
  const payload = generateMetricsPayload(BATCH_SIZE);

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Prometheus-Remote-Write-Version': '0.1.0',
    },
    timeout: '30s',
  };

  const startTime = Date.now();
  const response = http.post(REMOTE_WRITE_ENDPOINT, payload, params);
  const duration = Date.now() - startTime;

  // Validate response
  const success = check(response, {
    'status is 200 or 204': (r) => r.status === 200 || r.status === 204,
    'no server errors': (r) => r.status < 500,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });

  if (success) {
    metricsWritten.add(BATCH_SIZE);
    writeLatency.add(duration);
  }

  // Add some think time to simulate realistic load
  sleep(Math.random() * 2 + 1);  // 1-3 seconds
}

// Setup function - runs once at start
export function setup() {
  console.log(`Starting metrics load test against ${BASE_URL}`);
  console.log(`Batch size: ${BATCH_SIZE} metrics per request`);
  console.log(`Expected throughput: ~${BATCH_SIZE * 100} metrics/sec at peak`);

  // Verify Prometheus is accessible
  const response = http.get(`${BASE_URL}/-/healthy`);
  if (response.status !== 200) {
    throw new Error(`Prometheus not healthy: ${response.status}`);
  }

  return {
    testStartTime: Date.now(),
    prometheusUrl: BASE_URL,
  };
}

// Teardown function - runs once at end
export function teardown(data) {
  const duration = (Date.now() - data.testStartTime) / 1000;
  console.log(`Test completed in ${duration.toFixed(2)} seconds`);
  console.log('Check Prometheus for ingested metrics:');
  console.log(`  curl "${data.prometheusUrl}/api/v1/query?query=load_test_metric_0"`);
}

// Handle summary data
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-metrics-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = `\n${indent}========================================\n`;
  summary += `${indent}Load Test Summary - Metrics Ingestion\n`;
  summary += `${indent}========================================\n\n`;

  summary += `${indent}Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/sec\n`;
  summary += `${indent}Failed Requests: ${data.metrics.http_req_failed.values.rate.toFixed(2)}%\n\n`;

  summary += `${indent}Response Time (ms):\n`;
  summary += `${indent}  Min: ${data.metrics.http_req_duration.values.min.toFixed(2)}\n`;
  summary += `${indent}  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}\n`;
  summary += `${indent}  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}\n`;
  summary += `${indent}  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}\n`;
  summary += `${indent}  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}\n\n`;

  summary += `${indent}Metrics Written: ${data.metrics.metrics_written.values.count}\n`;
  summary += `${indent}Write Rate: ${data.metrics.metrics_written.values.rate.toFixed(2)}/sec\n\n`;

  summary += `${indent}Thresholds:\n`;
  Object.entries(data.metrics).forEach(([name, metric]) => {
    if (metric.thresholds) {
      Object.entries(metric.thresholds).forEach(([threshold, result]) => {
        const status = result.ok ? 'PASS' : 'FAIL';
        const color = result.ok ? (enableColors ? '\x1b[32m' : '') : (enableColors ? '\x1b[31m' : '');
        const reset = enableColors ? '\x1b[0m' : '';
        summary += `${indent}  ${color}${status}${reset} ${threshold}\n`;
      });
    }
  });

  summary += `\n${indent}========================================\n`;

  return summary;
}
