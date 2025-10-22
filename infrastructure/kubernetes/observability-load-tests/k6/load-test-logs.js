// k6 Load Test: Loki Log Ingestion
// Tests log write performance via push API

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Custom metrics
const logsWritten = new Counter('logs_written');
const pushLatency = new Trend('push_latency_ms');

// Load test configuration
export const options = {
  stages: [
    { duration: '1m', target: 50 },    // Ramp up to 50 VUs
    { duration: '5m', target: 50 },    // Sustain 50 VUs
    { duration: '1m', target: 100 },   // Spike to 100 VUs
    { duration: '3m', target: 100 },   // Sustain spike
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // SLA requirements
    'http_req_duration': ['p(95)<1000'],      // 95% under 1s
    'http_req_failed': ['rate<0.01'],         // <1% failures
    'push_latency_ms': ['p(95)<800'],         // Custom metric threshold
    'logs_written': ['count>500000'],         // >500K logs in test
  },
  tags: {
    test_type: 'log_ingestion',
    component: 'loki',
  },
};

// Test configuration
const BASE_URL = __ENV.LOKI_URL || 'http://loki:3100';
const PUSH_ENDPOINT = `${BASE_URL}/loki/api/v1/push`;
const LOGS_PER_BATCH = parseInt(__ENV.LOGS_PER_BATCH) || 100;

// Log levels and sample messages
const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];
const LOG_MESSAGES = [
  'Processing request from client',
  'Database query executed successfully',
  'Cache hit for key',
  'API call completed',
  'Authentication successful',
  'Rate limit check passed',
  'Validation completed',
  'Background job started',
  'Configuration loaded',
  'Health check passed',
];

const ERROR_MESSAGES = [
  'Connection timeout to database',
  'Invalid authentication token',
  'Rate limit exceeded',
  'Resource not found',
  'Internal server error',
  'Permission denied',
  'Service unavailable',
  'Bad request format',
];

// Generate realistic structured log entries
function generateLogsPayload(batchSize) {
  const timestamp = Date.now() * 1000000;  // Nanoseconds
  const streams = [];

  for (let i = 0; i < batchSize; i++) {
    const level = LOG_LEVELS[i % LOG_LEVELS.length];
    const isError = level === 'error' || level === 'fatal';
    const message = isError
      ? ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)]
      : LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)];

    const logEntry = {
      timestamp: timestamp + (i * 1000),  // Spread logs across time
      level: level,
      message: message,
      service: 'k6-load-test',
      instance: `instance-${__VU}`,
      thread: `thread-${Math.floor(Math.random() * 10)}`,
      request_id: `req-${Date.now()}-${i}`,
      duration_ms: Math.floor(Math.random() * 500),
    };

    // Add trace_id for some logs (correlation)
    if (Math.random() > 0.7) {
      logEntry.trace_id = `trace-${Date.now()}-${__VU}`;
    }

    // Add error details for error logs
    if (isError) {
      logEntry.error_type = ['TimeoutError', 'ValidationError', 'DatabaseError'][Math.floor(Math.random() * 3)];
      logEntry.stack_trace = `Error at line ${Math.floor(Math.random() * 1000)}`;
    }

    streams.push({
      stream: {
        job: 'k6-load-test',
        level: level,
        service: logEntry.service,
        instance: logEntry.instance,
      },
      values: [
        [`${logEntry.timestamp}`, JSON.stringify(logEntry)],
      ],
    });
  }

  return JSON.stringify({ streams });
}

// Main test function
export default function () {
  const payload = generateLogsPayload(LOGS_PER_BATCH);

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Scope-OrgID': 'k6-load-test',  // Tenant ID
    },
    timeout: '30s',
  };

  const startTime = Date.now();
  const response = http.post(PUSH_ENDPOINT, payload, params);
  const duration = Date.now() - startTime;

  // Validate response
  const success = check(response, {
    'status is 204': (r) => r.status === 204,
    'no server errors': (r) => r.status < 500,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  if (success) {
    logsWritten.add(LOGS_PER_BATCH);
    pushLatency.add(duration);
  }

  // Think time
  sleep(Math.random() * 1.5 + 0.5);  // 0.5-2 seconds
}

// Setup function
export function setup() {
  console.log(`Starting log ingestion load test against ${BASE_URL}`);
  console.log(`Batch size: ${LOGS_PER_BATCH} logs per request`);
  console.log(`Expected throughput: ~${LOGS_PER_BATCH * 50} logs/sec at peak`);

  // Verify Loki is accessible
  const response = http.get(`${BASE_URL}/ready`);
  if (response.status !== 200) {
    throw new Error(`Loki not ready: ${response.status}`);
  }

  return {
    testStartTime: Date.now(),
    lokiUrl: BASE_URL,
  };
}

// Teardown function
export function teardown(data) {
  const duration = (Date.now() - data.testStartTime) / 1000;
  console.log(`Test completed in ${duration.toFixed(2)} seconds`);
  console.log('Query logs in Loki:');
  console.log(`  curl "${data.lokiUrl}/loki/api/v1/query?query={job='k6-load-test'}"`);
}

// Handle summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-logs-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = `\n${indent}========================================\n`;
  summary += `${indent}Load Test Summary - Log Ingestion\n`;
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

  summary += `${indent}Logs Written: ${data.metrics.logs_written.values.count}\n`;
  summary += `${indent}Write Rate: ${data.metrics.logs_written.values.rate.toFixed(2)}/sec\n\n`;

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
