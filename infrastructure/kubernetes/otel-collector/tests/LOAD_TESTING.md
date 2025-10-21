# OpenTelemetry Collector Load Testing

This directory contains load testing tools for validating OpenTelemetry Collector capacity and performance.

## Overview

Load testing ensures the collector can handle production traffic volumes without data loss or performance degradation. The suite uses `telemetrygen` to generate synthetic OTLP telemetry at configurable rates.

## Target Capacity

Based on Health Tracker CI/CD pipeline requirements:

| Signal Type | Target Rate | Rationale |
|-------------|-------------|-----------|
| **Spans** | 10,000/sec | ~600K spans/min from instrumented workflows |
| **Metrics** | 5,000/sec | Container, application, and infrastructure metrics |
| **Logs** | 1,000/sec | Structured logs from GitHub Actions and services |

## Test Suite Components

### 1. Shell Script (`load-test.sh`)

**Purpose**: Standalone load test script for local or remote testing

**Features**:
- Multi-signal load generation (spans, metrics, logs)
- Real-time monitoring via Prometheus queries
- Resource usage tracking
- Data loss detection
- JSON results output
- Pass/fail validation

**Usage**:

```bash
# Basic usage (local collector)
./load-test.sh

# Custom target rates
TARGET_SPANS_PER_SEC=15000 \
TARGET_METRICS_PER_SEC=7500 \
TARGET_LOGS_PER_SEC=1500 \
./load-test.sh

# Remote collector
OTEL_COLLECTOR_HOST=otel-collector.observability.svc.cluster.local \
PROMETHEUS_URL=http://prometheus.observability.svc.cluster.local:9090 \
./load-test.sh

# Short test
DURATION=30 ./load-test.sh
```

**Prerequisites**:
- `telemetrygen` installed: `go install github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@latest`
- `bc` for calculations
- `jq` for JSON processing
- `curl` for Prometheus queries
- Prometheus accessible for metrics collection

**Output**:
- `./load-test-results/load-test-YYYYMMDD_HHMMSS.json` - Structured results
- `./load-test-results/spans-YYYYMMDD_HHMMSS.log` - Span generator logs
- `./load-test-results/metrics-YYYYMMDD_HHMMSS.log` - Metrics generator logs
- `./load-test-results/logs-YYYYMMDD_HHMMSS.log` - Logs generator logs

### 2. Kubernetes Job (`load-test-job.yaml`)

**Purpose**: In-cluster load testing via Kubernetes Job

**Components**:
- **Job**: One-time load test (manual execution)
- **CronJob**: Scheduled daily validation tests
- **ConfigMap**: Helper scripts

**Job Execution**:

```bash
# Run one-time load test
kubectl apply -f load-test-job.yaml

# Watch progress
kubectl logs -n observability -l app=otel-collector-load-test -f --all-containers

# Check results
kubectl get job -n observability otel-collector-load-test

# Cleanup
kubectl delete job -n observability otel-collector-load-test
```

**CronJob Management**:

```bash
# View schedule
kubectl get cronjob -n observability otel-collector-load-test-scheduled

# Trigger manual run
kubectl create job -n observability \
  --from=cronjob/otel-collector-load-test-scheduled \
  otel-load-test-manual-$(date +%s)

# View history
kubectl get jobs -n observability -l app=otel-collector-load-test

# Disable scheduled runs
kubectl patch cronjob -n observability otel-collector-load-test-scheduled \
  -p '{"spec":{"suspend":true}}'
```

## Performance Baselines

Expected performance on standard configuration (3 replicas, 500m-2CPU, 512Mi-2Gi):

### Throughput

| Metric | Target | Acceptable Range | Action if Outside Range |
|--------|--------|------------------|-------------------------|
| Spans | 10,000/s | 9,000-12,000/s | Scale pods or tune batch size |
| Metrics | 5,000/s | 4,500-6,000/s | Scale pods or tune batch size |
| Logs | 1,000/s | 900-1,200/s | Scale pods or tune batch size |

### Latency (P99)

| Stage | Target | Acceptable | Action Threshold |
|-------|--------|------------|------------------|
| Receiver | < 10ms | < 20ms | Review network/TLS config |
| Processor | < 50ms | < 100ms | Optimize processor pipeline |
| Exporter | < 100ms | < 200ms | Check downstream systems |
| **End-to-End** | **< 160ms** | **< 320ms** | Full pipeline review |

### Resource Usage

| Resource | Expected | Warning | Critical |
|----------|----------|---------|----------|
| CPU (per pod) | 1-1.5 cores | 1.5-1.8 cores | > 1.8 cores |
| Memory (per pod) | 800-1200 MB | 1200-1800 MB | > 1800 MB |
| Queue size | < 200 items | 200-500 items | > 500 items |

### Data Loss

| Metric | Target | Acceptable | Unacceptable |
|--------|--------|------------|--------------|
| Dropped spans | 0/s | 0/s | > 0/s |
| Dropped metrics | 0/s | 0/s | > 0/s |
| Dropped logs | 0/s | 0/s | > 0/s |
| Export failures | 0% | < 0.1% | > 0.1% |

**Zero Tolerance**: Any data loss indicates a capacity or configuration issue requiring immediate investigation.

## Interpreting Results

### Success Criteria

A load test **passes** if:
1. ✅ All target rates achieved (±10%)
2. ✅ Zero data loss (no drops)
3. ✅ P99 latency < 320ms
4. ✅ CPU < 1.8 cores per pod
5. ✅ Memory < 1.8 GB per pod
6. ✅ Queue size < 500 items
7. ✅ Export failure rate < 0.1%

### Failure Analysis

#### Data Loss Detected

**Symptoms**: `otelcol_processor_dropped_*` > 0

**Causes**:
1. Memory limiter triggered (insufficient memory)
2. Exporter queue full (downstream can't keep up)
3. Batch processor timeout (batches not sending fast enough)

**Resolution**:
```yaml
# Increase memory limits
resources:
  limits:
    memory: 3Gi  # Up from 2Gi

# Increase queue size
exporters:
  otlp/traces:
    sending_queue:
      queue_size: 2000  # Up from 1000
```

#### High Latency

**Symptoms**: P99 > 320ms

**Causes**:
1. CPU throttling (hitting limits)
2. Network latency to downstream systems
3. Inefficient processor configuration

**Resolution**:
```yaml
# Increase CPU limits
resources:
  limits:
    cpu: 3000m  # Up from 2000m

# Optimize batch processor
processors:
  batch:
    timeout: 5s  # Down from 10s for faster export
    send_batch_size: 2048  # Up from 1024
```

#### Queue Buildup

**Symptoms**: `otelcol_exporter_queue_size` > 500

**Causes**:
1. Downstream system slow or unavailable
2. Insufficient export workers
3. Network bandwidth constraints

**Resolution**:
```yaml
exporters:
  otlp/traces:
    sending_queue:
      num_consumers: 20  # Up from 10
    timeout: 30s
```

#### Resource Exhaustion

**Symptoms**: CPU > 90% or Memory > 90%

**Resolution**:
- **Horizontal scaling**: Increase HPA `maxReplicas`
- **Vertical scaling**: Increase resource limits
- **Pipeline optimization**: Remove unnecessary processors

## Load Test Scenarios

### Scenario 1: Baseline Capacity

**Purpose**: Validate standard configuration meets target rates

```bash
TARGET_SPANS_PER_SEC=10000 \
TARGET_METRICS_PER_SEC=5000 \
TARGET_LOGS_PER_SEC=1000 \
DURATION=300 \
./load-test.sh
```

**Expected**: PASS with < 70% resource usage

### Scenario 2: Peak Load

**Purpose**: Test 2x peak capacity for traffic spikes

```bash
TARGET_SPANS_PER_SEC=20000 \
TARGET_METRICS_PER_SEC=10000 \
TARGET_LOGS_PER_SEC=2000 \
DURATION=180 \
./load-test.sh
```

**Expected**: PASS with HPA scaling to 5-6 pods

### Scenario 3: Sustained Load

**Purpose**: Validate stability over extended period

```bash
TARGET_SPANS_PER_SEC=10000 \
TARGET_METRICS_PER_SEC=5000 \
TARGET_LOGS_PER_SEC=1000 \
DURATION=3600 \
./load-test.sh
```

**Expected**: PASS with stable resource usage (no memory leaks)

### Scenario 4: Stress Test

**Purpose**: Find breaking point

```bash
# Start with baseline and increase by 50% every 5 minutes
for rate in 10000 15000 22500 33750 50625; do
  TARGET_SPANS_PER_SEC=$rate \
  TARGET_METRICS_PER_SEC=$((rate/2)) \
  TARGET_LOGS_PER_SEC=$((rate/10)) \
  DURATION=300 \
  ./load-test.sh || break
done
```

**Expected**: Identify maximum throughput before data loss

### Scenario 5: Failure Recovery

**Purpose**: Test behavior during downstream outage

```bash
# 1. Start load test
TARGET_SPANS_PER_SEC=10000 DURATION=600 ./load-test.sh &
LOAD_PID=$!

# 2. Simulate downstream failure (after 120s)
sleep 120
kubectl scale deployment tempo -n observability --replicas=0

# 3. Wait 180s
sleep 180

# 4. Restore downstream
kubectl scale deployment tempo -n observability --replicas=3

# 5. Check if queue recovered without data loss
wait $LOAD_PID
```

**Expected**: Queue builds up but no data loss, recovers when downstream restored

## Continuous Validation

### Daily Automated Tests

The CronJob runs daily at 3 AM with reduced load (50% of peak):
- Validates configuration changes haven't broken capacity
- Catches gradual performance degradation
- Provides trend data for capacity planning

### Alert Integration

Configure Prometheus alerts for load test failures:

```yaml
- alert: LoadTestFailed
  expr: |
    kube_job_status_failed{job_name=~"otel-collector-load-test.*"} > 0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "OTel Collector load test failed"
    description: "Check job logs: kubectl logs -n observability job/{{ $labels.job_name }}"

- alert: LoadTestNotRunRecently
  expr: |
    (time() - kube_job_status_start_time{job_name=~"otel-collector-load-test-scheduled.*"}) > 86400 * 2
  labels:
    severity: warning
  annotations:
    summary: "OTel Collector load test hasn't run in 2 days"
```

## Capacity Planning

Use load test results to plan for growth:

### Current Capacity

- **3 pods** @ 10K spans/s = **30K spans/s** total
- **Cost**: ~$50/month (assuming cloud provider costs)
- **Headroom**: 2x (can handle 20K spans/s burst)

### Growth Projection

| Month | Expected Load | Required Pods | Action |
|-------|---------------|---------------|--------|
| Current | 10K spans/s | 3 | Baseline |
| +3 months | 15K spans/s | 5 | Adjust HPA maxReplicas |
| +6 months | 22K spans/s | 7 | Consider vertical scaling |
| +12 months | 35K spans/s | 12 | Evaluate dedicated cluster |

### Cost Optimization

Run load tests to find optimal configuration:

1. **Test with fewer replicas**: Can 2 pods handle baseline load?
2. **Test with smaller instances**: Can we reduce CPU/memory limits?
3. **Test batch size tuning**: Can larger batches reduce overhead?

## Troubleshooting

### telemetrygen not found

```bash
go install github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@latest
```

### Connection refused

```bash
# Check collector is running
kubectl get pods -n observability -l app=otel-collector

# Port forward for local testing
kubectl port-forward -n observability svc/otel-collector 4317:4317
```

### Prometheus queries returning 0

```bash
# Verify Prometheus is scraping collector
kubectl port-forward -n observability svc/prometheus 9090:9090
# Visit http://localhost:9090/targets

# Check collector metrics endpoint
kubectl port-forward -n observability svc/otel-collector 8888:8888
curl http://localhost:8888/metrics | grep otelcol_receiver
```

### Load test passes but production has issues

Load tests only validate collector capacity. Check:
- **Network latency**: Load test may be in same cluster as collector
- **Data variety**: Real data may have higher cardinality
- **Bursty traffic**: Production may have spikes not captured in steady-state tests
- **Downstream systems**: Production backends may be slower

## References

- [telemetrygen Documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/cmd/telemetrygen)
- [OTel Collector Performance](https://opentelemetry.io/docs/collector/performance/)
- [Load Testing Best Practices](https://opentelemetry.io/docs/collector/scaling/)
