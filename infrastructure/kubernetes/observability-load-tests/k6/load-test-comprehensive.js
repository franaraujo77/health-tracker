// k6 Comprehensive Load Test: All Observability Components
// Tests metrics, logs, and traces simultaneously

import metricsTest from './load-test-metrics.js';
import logsTest from './load-test-logs.js';
import tracesTest from './load-test-traces.js';

export const options = {
  scenarios: {
    metrics_ingestion: {
      executor: 'ramping-vus',
      exec: 'testMetrics',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'metrics' },
    },
    log_ingestion: {
      executor: 'ramping-vus',
      exec: 'testLogs',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'logs' },
    },
    trace_ingestion: {
      executor: 'ramping-vus',
      exec: 'testTraces',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 25 },
        { duration: '5m', target: 25 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'traces' },
    },
  },
  thresholds: {
    // Global thresholds
    'http_req_duration': ['p(95)<2000'],      // 95% under 2s across all scenarios
    'http_req_failed': ['rate<0.02'],         // <2% failures overall
    // Scenario-specific thresholds
    'http_req_duration{test_type:metrics}': ['p(95)<500'],
    'http_req_duration{test_type:logs}': ['p(95)<1000'],
    'http_req_duration{test_type:traces}': ['p(95)<2000'],
  },
};

// Export scenario functions
export function testMetrics() {
  metricsTest.default();
}

export function testLogs() {
  logsTest.default();
}

export function testTraces() {
  tracesTest.default();
}

// Setup - runs once before all scenarios
export function setup() {
  console.log('===========================================');
  console.log('Comprehensive Observability Load Test');
  console.log('===========================================');
  console.log('');
  console.log('Testing:');
  console.log('  - Metrics ingestion (Prometheus)');
  console.log('  - Log ingestion (Loki)');
  console.log('  - Trace ingestion (Tempo)');
  console.log('');
  console.log('Peak load:');
  console.log('  - 100 VUs for metrics (~100k metrics/sec)');
  console.log('  - 50 VUs for logs (~5k logs/sec)');
  console.log('  - 25 VUs for traces (~250 traces/sec, ~2.5k spans/sec)');
  console.log('');
  console.log('Duration: ~8 minutes');
  console.log('===========================================');
  console.log('');

  return {
    testStartTime: Date.now(),
  };
}

// Teardown - runs once after all scenarios
export function teardown(data) {
  const duration = (Date.now() - data.testStartTime) / 1000 / 60;
  console.log('');
  console.log('===========================================');
  console.log(`Test completed in ${duration.toFixed(2)} minutes`);
  console.log('===========================================');
  console.log('');
  console.log('Next steps:');
  console.log('1. Check Grafana dashboards for ingested data');
  console.log('2. Verify no alerts fired during load test');
  console.log('3. Review resource utilization (CPU, memory, disk)');
  console.log('4. Compare results against performance baselines');
  console.log('');
}

// Custom summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-comprehensive-summary.json': JSON.stringify(data, null, 2),
    'load-test-comprehensive-summary.html': htmlReport(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  let summary = `\n${indent}===========================================\n`;
  summary += `${indent}Comprehensive Load Test Summary\n`;
  summary += `${indent}===========================================\n\n`;

  // Overall statistics
  summary += `${indent}Overall Statistics:\n`;
  summary += `${indent}  Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/sec\n`;
  summary += `${indent}  Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  summary += `${indent}  Response Time (P95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n\n`;

  // Scenario breakdown
  const scenarios = ['metrics', 'logs', 'traces'];
  scenarios.forEach(scenario => {
    const metricKey = `http_req_duration{test_type:${scenario}}`;
    if (data.metrics[metricKey]) {
      const metric = data.metrics[metricKey];
      summary += `${indent}${scenario.charAt(0).toUpperCase() + scenario.slice(1)} Ingestion:\n`;
      summary += `${indent}  Requests: ${metric.values.count}\n`;
      summary += `${indent}  Avg Duration: ${metric.values.avg.toFixed(2)}ms\n`;
      summary += `${indent}  P95 Duration: ${metric.values['p(95)'].toFixed(2)}ms\n`;
      summary += `${indent}  P99 Duration: ${metric.values['p(99)'].toFixed(2)}ms\n\n`;
    }
  });

  // Threshold results
  summary += `${indent}Threshold Results:\n`;
  let allPassed = true;
  Object.entries(data.metrics).forEach(([name, metric]) => {
    if (metric.thresholds) {
      Object.entries(metric.thresholds).forEach(([threshold, result]) => {
        const status = result.ok ? 'PASS' : 'FAIL';
        const color = result.ok ? '\x1b[32m' : '\x1b[31m';
        const reset = '\x1b[0m';
        summary += `${indent}  ${color}${status}${reset} ${name}: ${threshold}\n`;
        if (!result.ok) allPassed = false;
      });
    }
  });

  summary += `\n${indent}===========================================\n`;
  summary += `${indent}Overall Result: ${allPassed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}\n`;
  summary += `${indent}===========================================\n\n`;

  return summary;
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>k6 Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .pass { color: green; font-weight: bold; }
    .fail { color: red; font-weight: bold; }
    .metric { background-color: #f9f9f9; }
  </style>
</head>
<body>
  <h1>Observability Load Test Report</h1>
  <p><strong>Test Duration:</strong> ${data.state.testRunDurationMs / 1000 / 60} minutes</p>
  <p><strong>Total Requests:</strong> ${data.metrics.http_reqs.values.count}</p>
  <p><strong>Request Rate:</strong> ${data.metrics.http_reqs.values.rate.toFixed(2)}/sec</p>

  <h2>Response Time Metrics</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Min</th>
      <th>Avg</th>
      <th>P95</th>
      <th>P99</th>
      <th>Max</th>
    </tr>
    <tr>
      <td>Overall</td>
      <td>${data.metrics.http_req_duration.values.min.toFixed(2)}ms</td>
      <td>${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</td>
      <td>${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</td>
      <td>${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms</td>
      <td>${data.metrics.http_req_duration.values.max.toFixed(2)}ms</td>
    </tr>
  </table>

  <h2>Threshold Results</h2>
  <table>
    <tr>
      <th>Threshold</th>
      <th>Result</th>
    </tr>
    ${Object.entries(data.metrics).map(([name, metric]) => {
      if (metric.thresholds) {
        return Object.entries(metric.thresholds).map(([threshold, result]) => `
          <tr>
            <td>${name}: ${threshold}</td>
            <td class="${result.ok ? 'pass' : 'fail'}">${result.ok ? 'PASS' : 'FAIL'}</td>
          </tr>
        `).join('');
      }
      return '';
    }).join('')}
  </table>
</body>
</html>
  `;
}
