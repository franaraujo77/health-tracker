# Observability Load Testing Suite

## Overview

Comprehensive load testing infrastructure for validating observability stack performance. Tests metrics, logs, and traces ingestion under realistic production loads using k6.

## Features

- ✅ **Metrics Ingestion Testing** - Prometheus remote write API (100K metrics/sec)
- ✅ **Log Ingestion Testing** - Loki push API (10K logs/sec)
- ✅ **Trace Ingestion Testing** - Tempo OTLP HTTP (1K traces/sec, 10K spans/sec)
- ✅ **Comprehensive Testing** - All components simultaneously
- ✅ **SLA Validation** - Automated threshold checking
- ✅ **Performance Baselines** - Documented acceptance criteria
- ✅ **Detailed Reporting** - JSON, HTML, and text summaries

## Quick Start

### Prerequisites

- k6 installed locally OR Docker
- Access to observability stack (Prometheus, Loki, Tempo)
- kubectl configured (for Kubernetes deployment)

### Run Tests Locally

```bash
# Navigate to test directory
cd infrastructure/kubernetes/observability-load-tests

# Run comprehensive test (all components)
./run-load-tests.sh comprehensive short

# Run specific component tests
./run-load-tests.sh metrics medium
./run-load-tests.sh logs short
./run-load-tests.sh traces short
```

### Run Tests in Kubernetes

```bash
# Apply ConfigMap with test scripts
kubectl create configmap k6-load-test-scripts \
  -n observability \
  --from-file=k6/

# Run load test job
kubectl apply -f k8s/load-test-job.yaml

# Monitor progress
kubectl logs -n observability -l app=k6-load-test -f

# Get results
kubectl cp observability/k6-load-test-xxx:/tmp/results.json ./results.json
```

## Test Scripts

### 1. Metrics Ingestion (`load-test-metrics.js`)

**Tests:** Prometheus remote write API

**Load Profile:**
- Ramp up: 2 minutes to 100 VUs
- Sustain: 5 minutes at 100 VUs
- Spike: 2 minutes to 200 VUs
- Sustain spike: 3 minutes at 200 VUs
- Ramp down: 2 minutes to 0

**Metrics Generated:**
- 10 different metric names
- Labels: job, instance, test_run, metric_type
- Values: Random (0-100)
- Batch size: 100 metrics/request (configurable)

**Thresholds:**
- P95 latency: <500ms
- Error rate: <1%
- Write latency: <300ms (custom metric)
- Total metrics: >1M during test

**Environment Variables:**
- `PROMETHEUS_URL` - Prometheus endpoint (default: http://prometheus:9090)
- `BATCH_SIZE` - Metrics per request (default: 100)
- `TEST_RUN_ID` - Unique test identifier

### 2. Log Ingestion (`load-test-logs.js`)

**Tests:** Loki push API

**Load Profile:**
- Ramp up: 1 minute to 50 VUs
- Sustain: 5 minutes at 50 VUs
- Spike: 1 minute to 100 VUs
- Sustain spike: 3 minutes at 100 VUs
- Ramp down: 1 minute to 0

**Logs Generated:**
- Structured JSON format
- Log levels: debug, info, warn, error, fatal
- Fields: timestamp, level, message, service, instance, request_id, duration_ms
- trace_id included in 30% of logs (for correlation)
- Batch size: 100 logs/request (configurable)

**Thresholds:**
- P95 latency: <1000ms
- Error rate: <1%
- Push latency: <800ms (custom metric)
- Total logs: >500K during test

**Environment Variables:**
- `LOKI_URL` - Loki endpoint (default: http://loki:3100)
- `LOGS_PER_BATCH` - Logs per request (default: 100)

### 3. Trace Ingestion (`load-test-traces.js`)

**Tests:** Tempo OTLP HTTP endpoint

**Load Profile:**
- Ramp up: 1 minute to 25 VUs
- Sustain: 5 minutes at 25 VUs
- Spike: 1 minute to 50 VUs
- Sustain spike: 3 minutes at 50 VUs
- Ramp down: 1 minute to 0

**Traces Generated:**
- Distributed traces with 10 spans each (configurable)
- Parent-child span relationships
- Span operations: HTTP requests, DB queries, cache lookups, etc.
- Span status: OK (70%), ERROR (30%)
- Attributes: service.name, http.method, http.status_code, etc.

**Thresholds:**
- P95 latency: <2000ms
- Error rate: <1%
- Push latency: <1500ms (custom metric)
- Total traces: >50K during test
- Total spans: >500K during test

**Environment Variables:**
- `TEMPO_URL` - Tempo endpoint (default: http://tempo:4318)
- `SPANS_PER_TRACE` - Spans per trace (default: 10)

### 4. Comprehensive Test (`load-test-comprehensive.js`)

**Tests:** All components simultaneously

**Scenarios:**
- Metrics: 100 VUs (100K metrics/sec)
- Logs: 50 VUs (5K logs/sec)
- Traces: 25 VUs (250 traces/sec)

**Thresholds:**
- Global P95: <2000ms
- Global error rate: <2%
- Per-component thresholds as above

**Outputs:**
- JSON summary
- HTML report
- Text summary to stdout

## Usage Examples

### Basic Usage

```bash
# Short test (2 minutes, 25 VUs)
./run-load-tests.sh metrics short

# Medium test (5 minutes, 50 VUs)
./run-load-tests.sh logs medium

# Long test (10 minutes, 100 VUs)
./run-load-tests.sh traces long
```

### Custom Configuration

```bash
# Override endpoints
export PROMETHEUS_URL=http://prometheus.example.com:9090
export LOKI_URL=http://loki.example.com:3100
export TEMPO_URL=http://tempo.example.com:4318

# Run test
./run-load-tests.sh comprehensive medium
```

### Docker Usage

```bash
# Run with Docker
docker run --rm \
  --network host \
  -v "$(pwd)/k6:/scripts:ro" \
  -v "$(pwd)/results:/results" \
  -e PROMETHEUS_URL=http://localhost:9090 \
  grafana/k6:0.48.0 \
  run /scripts/load-test-metrics.js
```

### Kubernetes Usage

```bash
# Create namespace
kubectl create namespace observability

# Create ConfigMap with scripts
kubectl create configmap k6-load-test-scripts \
  -n observability \
  --from-file=k6/load-test-metrics.js \
  --from-file=k6/load-test-logs.js \
  --from-file=k6/load-test-traces.js \
  --from-file=k6/load-test-comprehensive.js

# Run job
kubectl apply -f k8s/load-test-job.yaml

# Check status
kubectl get jobs -n observability
kubectl describe job k6-load-test-observability -n observability

# View logs
kubectl logs -n observability -l app=k6-load-test -f

# Get results
POD=$(kubectl get pods -n observability -l app=k6-load-test -o jsonpath='{.items[0].metadata.name}')
kubectl cp observability/$POD:/tmp/results.json ./results/results.json
kubectl cp observability/$POD:/tmp/*.json ./results/

# Clean up
kubectl delete job k6-load-test-observability -n observability
```

## Results Interpretation

### Success Criteria

✅ **PASS** if:
- All thresholds met (P95 < target, error rate < 1%)
- No component failures during test
- Resource utilization within limits
- Summary shows green "PASS" indicators

⚠️ **WARNING** if:
- Some thresholds exceeded by <10%
- Error rate 1-2%
- Resource utilization 80-90%

❌ **FAIL** if:
- Critical thresholds exceeded
- Error rate >2%
- Component crashes
- Data loss detected

### Reading Results

**JSON Output:**
```json
{
  "metrics": {
    "http_req_duration": {
      "values": {
        "avg": 125.5,
        "min": 10.2,
        "med": 98.4,
        "max": 1250.8,
        "p(90)": 250.5,
        "p(95)": 380.2
      },
      "thresholds": {
        "p(95)<500": { "ok": true }
      }
    }
  }
}
```

**Text Summary:**
```
========================================
Load Test Summary - Metrics Ingestion
========================================

Total Requests: 15,234
Request Rate: 253.90/sec
Failed Requests: 0.15%

Response Time (ms):
  Min: 10.20
  Avg: 125.50
  P95: 380.20
  P99: 892.10
  Max: 1250.80

Metrics Written: 1,523,400
Write Rate: 25,390.00/sec

Thresholds:
  PASS http_req_duration: p(95)<500
  PASS http_req_failed: rate<0.01
  PASS write_latency_ms: p(95)<300

========================================
```

## Performance Baselines

See [PERFORMANCE-BASELINES.md](PERFORMANCE-BASELINES.md) for detailed acceptance criteria.

**Quick Reference:**

| Component | Throughput | P95 Latency | Error Rate |
|-----------|------------|-------------|------------|
| Metrics | 100K/sec | <500ms | <1% |
| Logs | 10K/sec | <1000ms | <1% |
| Traces | 1K/sec | <2000ms | <1% |

## Troubleshooting

### High Error Rates

**Symptoms:** `http_req_failed` > 1%

**Investigation:**
1. Check component health:
   ```bash
   kubectl get pods -n observability
   kubectl logs -n observability <pod-name>
   ```

2. Verify network connectivity:
   ```bash
   kubectl exec -n observability <test-pod> -- wget -O- <endpoint>
   ```

3. Check resource limits:
   ```bash
   kubectl top pods -n observability
   ```

**Common Causes:**
- Component overloaded
- Network issues
- Incorrect endpoint URLs
- Authentication failures

### Slow Response Times

**Symptoms:** P95 latency exceeds thresholds

**Investigation:**
1. Check component performance dashboards in Grafana
2. Review resource utilization (CPU, memory, disk I/O)
3. Check for competing workloads

**Common Causes:**
- Under-provisioned resources
- Disk I/O bottleneck
- Network latency
- Inefficient queries

### Test Failures

**Symptoms:** k6 exits with non-zero code

**Investigation:**
1. Review test output for errors
2. Check if services are accessible
3. Verify test configuration

**Common Causes:**
- Services not running
- Incorrect URLs
- Missing permissions
- Resource exhaustion

## Best Practices

1. **Start Small** - Run short tests before long ones
2. **Baseline First** - Establish baselines in non-production
3. **Monitor Impact** - Watch component metrics during tests
4. **Isolate Tests** - Don't run tests during production traffic
5. **Document Results** - Keep history of test runs
6. **Review Regularly** - Run tests weekly/monthly
7. **Update Thresholds** - Adjust as infrastructure changes
8. **Clean Up Data** - Remove test data after completion

## CI/CD Integration

### GitHub Actions

```yaml
name: Observability Load Test
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install k6
        run: |
          wget https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz
          tar xzf k6-v0.48.0-linux-amd64.tar.gz
          sudo mv k6-v0.48.0-linux-amd64/k6 /usr/local/bin/

      - name: Run Load Tests
        run: |
          cd infrastructure/kubernetes/observability-load-tests
          ./run-load-tests.sh comprehensive short

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: infrastructure/kubernetes/observability-load-tests/results/
```

## Advanced Configuration

### Custom Thresholds

Edit test script and modify `options.thresholds`:

```javascript
export const options = {
  thresholds: {
    'http_req_duration': ['p(95)<300'],  // Stricter threshold
    'http_req_failed': ['rate<0.005'],    // 0.5% error rate
    'custom_metric': ['p(99)<1000'],      // Custom metric threshold
  },
};
```

### Multiple Scenarios

```javascript
export const options = {
  scenarios: {
    smoke_test: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
    },
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 },
        { duration: '10m', target: 100 },
        { duration: '5m', target: 0 },
      ],
    },
  },
};
```

### Custom Metrics

```javascript
import { Trend } from 'k6/metrics';

const myCustomMetric = new Trend('custom_duration');

export default function () {
  const start = Date.now();
  // ... do something ...
  myCustomMetric.add(Date.now() - start);
}
```

## References

- [k6 Documentation](https://k6.io/docs/)
- [Prometheus Remote Write](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Loki Push API](https://grafana.com/docs/loki/latest/api/#post-lokiapiv1push)
- [OTLP Specification](https://opentelemetry.io/docs/reference/specification/protocol/otlp/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/performance-testing/)

---

**Last Updated:** 2025-10-22
**Maintainer:** DevOps Team
**Status:** Production Ready
