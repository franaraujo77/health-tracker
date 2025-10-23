// k6 Load Test: Tempo Trace Ingestion
// Tests trace write performance via OTLP HTTP endpoint

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import encoding from 'k6/encoding';

// Custom metrics
const tracesWritten = new Counter('traces_written');
const spansWritten = new Counter('spans_written');
const pushLatency = new Trend('push_latency_ms');

// Load test configuration
export const options = {
  stages: [
    { duration: '1m', target: 25 },    // Ramp up to 25 VUs
    { duration: '5m', target: 25 },    // Sustain 25 VUs
    { duration: '1m', target: 50 },    // Spike to 50 VUs
    { duration: '3m', target: 50 },    // Sustain spike
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // SLA requirements
    'http_req_duration': ['p(95)<2000'],      // 95% under 2s
    'http_req_failed': ['rate<0.01'],         // <1% failures
    'push_latency_ms': ['p(95)<1500'],        // Custom metric threshold
    'traces_written': ['count>50000'],        // >50K traces in test
    'spans_written': ['count>500000'],        // >500K spans in test
  },
  tags: {
    test_type: 'trace_ingestion',
    component: 'tempo',
  },
};

// Test configuration
const BASE_URL = __ENV.TEMPO_URL || 'http://tempo:4318';
const OTLP_ENDPOINT = `${BASE_URL}/v1/traces`;
const SPANS_PER_TRACE = parseInt(__ENV.SPANS_PER_TRACE) || 10;

// Span operations and attributes
const OPERATIONS = [
  'HTTP GET /api/users',
  'HTTP POST /api/orders',
  'Database Query',
  'Cache Lookup',
  'External API Call',
  'Message Queue Publish',
  'File I/O',
  'Authentication',
  'Validation',
  'Transform Data',
];

const SPAN_STATUSES = [
  { code: 0, message: '' },  // UNSET
  { code: 1, message: '' },  // OK
  { code: 2, message: 'Error occurred' },  // ERROR
];

// Generate trace ID (16 bytes hex)
function generateTraceId() {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate span ID (8 bytes hex)
function generateSpanId() {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate realistic distributed trace
function generateTracePayload(spansPerTrace) {
  const traceId = generateTraceId();
  const startTime = Date.now() * 1000000;  // Nanoseconds
  const spans = [];

  let parentSpanId = null;

  for (let i = 0; i < spansPerTrace; i++) {
    const spanId = generateSpanId();
    const operation = OPERATIONS[i % OPERATIONS.length];
    const duration = Math.floor(Math.random() * 500 + 10);  // 10-510ms
    const status = SPAN_STATUSES[Math.floor(Math.random() * (i === 0 ? 2 : 3))];  // Root rarely errors

    const span = {
      traceId: traceId,
      spanId: spanId,
      parentSpanId: parentSpanId,
      name: operation,
      kind: i === 0 ? 1 : (Math.random() > 0.5 ? 2 : 3),  // SERVER or CLIENT
      startTimeUnixNano: `${startTime + (i * duration * 1000000)}`,
      endTimeUnixNano: `${startTime + ((i + 1) * duration * 1000000)}`,
      attributes: [
        { key: 'service.name', value: { stringValue: 'k6-load-test' } },
        { key: 'service.version', value: { stringValue: '1.0.0' } },
        { key: 'http.method', value: { stringValue: ['GET', 'POST', 'PUT'][Math.floor(Math.random() * 3)] } },
        { key: 'http.status_code', value: { intValue: status.code === 2 ? 500 : 200 } },
        { key: 'http.url', value: { stringValue: `http://example.com${operation}` } },
        { key: 'instance.id', value: { stringValue: `instance-${__VU}` } },
        { key: 'thread.id', value: { intValue: Math.floor(Math.random() * 10) } },
      ],
      status: status,
    };

    // Add error details if status is ERROR
    if (status.code === 2) {
      span.attributes.push({
        key: 'error.type',
        value: { stringValue: ['TimeoutError', 'NetworkError', 'ValidationError'][Math.floor(Math.random() * 3)] }
      });
      span.attributes.push({
        key: 'error.message',
        value: { stringValue: status.message }
      });
    }

    spans.push(span);

    // Next span is child of current
    if (i === 0) {
      parentSpanId = spanId;
    }
  }

  return JSON.stringify({
    resourceSpans: [{
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: 'k6-load-test' } },
          { key: 'telemetry.sdk.name', value: { stringValue: 'k6' } },
          { key: 'telemetry.sdk.version', value: { stringValue: '0.1.0' } },
        ],
      },
      scopeSpans: [{
        scope: {
          name: 'k6-load-test-scope',
          version: '1.0.0',
        },
        spans: spans,
      }],
    }],
  });
}

// Main test function
export default function () {
  const payload = generateTracePayload(SPANS_PER_TRACE);

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '30s',
  };

  const startTime = Date.now();
  const response = http.post(OTLP_ENDPOINT, payload, params);
  const duration = Date.now() - startTime;

  // Validate response
  const success = check(response, {
    'status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    'no server errors': (r) => r.status < 500,
    'response time < 3s': (r) => r.timings.duration < 3000,
  });

  if (success) {
    tracesWritten.add(1);
    spansWritten.add(SPANS_PER_TRACE);
    pushLatency.add(duration);
  }

  // Think time
  sleep(Math.random() * 2 + 1);  // 1-3 seconds
}

// Setup function
export function setup() {
  console.log(`Starting trace ingestion load test against ${BASE_URL}`);
  console.log(`Spans per trace: ${SPANS_PER_TRACE}`);
  console.log(`Expected throughput: ~${SPANS_PER_TRACE * 25} spans/sec at peak`);

  // Verify Tempo is accessible
  const response = http.get(`${BASE_URL.replace('4318', '3200')}/ready`);
  if (response.status !== 200) {
    console.warn(`Tempo readiness check failed: ${response.status} (may still work)`);
  }

  return {
    testStartTime: Date.now(),
    tempoUrl: BASE_URL,
  };
}

// Teardown function
export function teardown(data) {
  const duration = (Date.now() - data.testStartTime) / 1000;
  console.log(`Test completed in ${duration.toFixed(2)} seconds`);
  console.log('Query traces in Tempo via Grafana or Tempo API');
}

// Handle summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-traces-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = `\n${indent}========================================\n`;
  summary += `${indent}Load Test Summary - Trace Ingestion\n`;
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

  summary += `${indent}Traces Written: ${data.metrics.traces_written.values.count}\n`;
  summary += `${indent}Trace Rate: ${data.metrics.traces_written.values.rate.toFixed(2)}/sec\n`;
  summary += `${indent}Spans Written: ${data.metrics.spans_written.values.count}\n`;
  summary += `${indent}Span Rate: ${data.metrics.spans_written.values.rate.toFixed(2)}/sec\n\n`;

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
