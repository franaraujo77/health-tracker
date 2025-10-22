# Performance Baselines

## Overview

This document defines performance baseline metrics for the observability stack. These baselines serve as:
- Acceptance criteria for load tests
- Early warning indicators for performance degradation
- Capacity planning reference points
- SLA targets for production environments

**Last Updated:** 2025-10-22
**Test Environment:** Kubernetes cluster with 3 nodes (4 CPU, 16GB RAM each)

---

## Metrics Ingestion (Prometheus)

### Target Throughput
| Metric | Baseline | Threshold | Notes |
|--------|----------|-----------|-------|
| **Ingestion Rate** | 100,000 metrics/sec | >80,000/sec | Via remote write API |
| **Batch Size** | 100 metrics/request | 50-500 optimal | Larger batches = better throughput |
| **Request Rate** | 1,000 requests/sec | >800/sec | At peak load |

### Latency Targets
| Percentile | Baseline | Threshold | SLA |
|------------|----------|-----------|-----|
| **P50** | 50ms | <100ms | Median response time |
| **P95** | 200ms | <500ms | 95th percentile SLA |
| **P99** | 400ms | <1000ms | 99th percentile |
| **Max** | 1000ms | <2000ms | Worst case |

### Resource Utilization
| Component | CPU | Memory | Disk I/O |
|-----------|-----|--------|----------|
| **Prometheus** | 60-70% | 70-80% | 50 MB/s write |
| **Remote Write** | 30-40% | 40-50% | N/A |

### Error Rates
- **HTTP 5xx Errors:** <0.1% (1 in 1000 requests)
- **Timeouts:** <0.5% (5 in 1000 requests)
- **Network Errors:** <0.01% (1 in 10,000 requests)

### Capacity Limits
- **Time Series Cardinality:** 10M active series
- **Samples per Second:** 1M sustained, 2M burst
- **Storage Growth:** ~2GB/day at baseline load
- **Query Performance:** <5 seconds for 30-day queries

---

## Log Ingestion (Loki)

### Target Throughput
| Metric | Baseline | Threshold | Notes |
|--------|----------|-----------|-------|
| **Ingestion Rate** | 10,000 logs/sec | >8,000/sec | Structured JSON logs |
| **Data Volume** | 10 MB/sec | >8 MB/sec | Compressed |
| **Batch Size** | 100 logs/request | 50-200 optimal | Balance latency vs throughput |
| **Request Rate** | 100 requests/sec | >80/sec | At peak load |

### Latency Targets
| Percentile | Baseline | Threshold | SLA |
|------------|----------|-----------|-----|
| **P50** | 100ms | <200ms | Median response time |
| **P95** | 400ms | <1000ms | 95th percentile SLA |
| **P99** | 800ms | <2000ms | 99th percentile |
| **Max** | 2000ms | <5000ms | Worst case |

### Resource Utilization
| Component | CPU | Memory | Disk I/O |
|-----------|-----|--------|----------|
| **Loki Distributor** | 40-50% | 30-40% | 100 MB/s write |
| **Loki Ingester** | 50-60% | 60-70% | 200 MB/s write |
| **Loki Querier** | 30-40% | 40-50% | 50 MB/s read |

### Error Rates
- **HTTP 5xx Errors:** <0.5% (5 in 1000 requests)
- **Timeouts:** <1% (10 in 1000 requests)
- **Dropped Logs:** <0.01% (1 in 10,000 logs)

### Capacity Limits
- **Active Streams:** 100,000 concurrent streams
- **Log Line Rate:** 100K/sec sustained, 200K/sec burst
- **Storage Growth:** ~500GB/day at baseline load (compressed)
- **Query Performance:** <10 seconds for 24-hour queries

---

## Trace Ingestion (Tempo)

### Target Throughput
| Metric | Baseline | Threshold | Notes |
|--------|----------|-----------|-------|
| **Trace Rate** | 1,000 traces/sec | >800/sec | Via OTLP HTTP |
| **Span Rate** | 10,000 spans/sec | >8,000/sec | Avg 10 spans/trace |
| **Data Volume** | 5 MB/sec | >4 MB/sec | Uncompressed |
| **Request Rate** | 50 requests/sec | >40/sec | At peak load |

### Latency Targets
| Percentile | Baseline | Threshold | SLA |
|------------|----------|-----------|-----|
| **P50** | 200ms | <500ms | Median response time |
| **P95** | 800ms | <2000ms | 95th percentile SLA |
| **P99** | 1500ms | <3000ms | 99th percentile |
| **Max** | 3000ms | <5000ms | Worst case |

### Resource Utilization
| Component | CPU | Memory | Disk I/O |
|-----------|-----|--------|----------|
| **Tempo Distributor** | 30-40% | 20-30% | 50 MB/s write |
| **Tempo Ingester** | 40-50% | 50-60% | 100 MB/s write |
| **Tempo Querier** | 30-40% | 30-40% | 20 MB/s read |

### Error Rates
- **HTTP 5xx Errors:** <0.5% (5 in 1000 requests)
- **Timeouts:** <1% (10 in 1000 requests)
- **Dropped Spans:** <0.01% (1 in 10,000 spans)

### Capacity Limits
- **Active Traces:** 10,000 in-flight traces
- **Trace Rate:** 10K/sec sustained, 20K/sec burst
- **Storage Growth:** ~100GB/day at baseline load (compressed)
- **Query Performance:** <5 seconds for trace lookup by ID

---

## Combined Load (All Components)

### System-Wide Metrics
| Metric | Baseline | Threshold | Notes |
|--------|----------|-----------|-------|
| **Total HTTP Requests/sec** | 1,150/sec | >920/sec | All components combined |
| **Total Data Ingested** | 15 MB/sec | >12 MB/sec | Uncompressed |
| **Network Bandwidth** | 120 Mbps | >96 Mbps | Inbound + outbound |

### Cluster Resource Utilization
| Resource | Baseline | Threshold | Alert |
|----------|----------|-----------|-------|
| **Total CPU** | 50-60% | <80% | >85% |
| **Total Memory** | 60-70% | <85% | >90% |
| **Disk I/O** | 500 MB/s | <800 MB/s | >900 MB/s |
| **Network I/O** | 15 MB/s | <25 MB/s | >30 MB/s |

### Overall SLA Targets
- **Uptime:** 99.9% (43.2 min downtime/month)
- **Request Success Rate:** >99% (<1% errors)
- **Data Loss:** <0.01% (99.99% reliability)
- **Query Performance:** 95% of queries <5 seconds

---

## Test Scenarios

### Scenario 1: Baseline Load
**Duration:** 5 minutes
**Configuration:**
- Metrics: 50,000/sec (50 VUs × 100 batch size)
- Logs: 5,000/sec (50 VUs × 100 batch size)
- Traces: 500/sec (25 VUs × 10 spans/trace)

**Expected Results:**
- All latency thresholds met
- <1% error rate
- CPU <60%, Memory <70%

### Scenario 2: Peak Load
**Duration:** 10 minutes
**Configuration:**
- Metrics: 100,000/sec (100 VUs × 100 batch size)
- Logs: 10,000/sec (100 VUs × 100 batch size)
- Traces: 1,000/sec (50 VUs × 10 spans/trace)

**Expected Results:**
- P95 latency within thresholds
- <2% error rate
- CPU <80%, Memory <85%

### Scenario 3: Burst Traffic
**Duration:** 2 minutes burst, 5 minutes sustained
**Configuration:**
- Spike to 2x peak load for 2 minutes
- Return to baseline for 5 minutes

**Expected Results:**
- System recovers within 1 minute
- No data loss
- Error rate <5% during burst, <1% after recovery

### Scenario 4: Sustained High Load
**Duration:** 30 minutes
**Configuration:**
- 80% of peak load sustained

**Expected Results:**
- No performance degradation over time
- Memory usage stable (no leaks)
- Disk I/O within limits

---

## Failure Scenarios

### Component Failure Recovery
| Scenario | MTTR Target | Data Loss Tolerance |
|----------|-------------|---------------------|
| **Prometheus Restart** | <2 min | <1 min of metrics |
| **Loki Restart** | <3 min | <2 min of logs |
| **Tempo Restart** | <3 min | <2 min of traces |
| **Network Partition** | <5 min | Buffered in queue |

### Degraded Performance Triggers
| Condition | Action | Recovery Time |
|-----------|--------|---------------|
| **CPU >85%** | Scale up pods | <5 min |
| **Memory >90%** | Restart pods | <3 min |
| **Disk >90%** | Enable compaction | <30 min |
| **Query latency >10s** | Add query cache | <10 min |

---

## Validation Criteria

### Pass Criteria
✓ All latency thresholds met (P95 < target)
✓ Error rate <1% overall
✓ Resource utilization within limits
✓ No data loss detected
✓ System recovers from burst load
✓ No memory leaks over sustained load

### Warning Criteria
⚠ P95 latency within 10% of threshold
⚠ Error rate 1-2%
⚠ CPU/Memory 80-90%
⚠ Disk I/O approaching limits
⚠ Recovery time >target but <2x target

### Fail Criteria
✗ P95 latency exceeds threshold
✗ Error rate >2%
✗ Resource exhaustion (CPU/Memory >95%)
✗ Data loss detected
✗ System does not recover from burst
✗ Memory leak observed

---

## Recommendations

### Optimizations for Better Performance

1. **Metrics Ingestion**
   - Increase remote write batch size to 200-500
   - Enable compression (snappy)
   - Use write-ahead log (WAL) for reliability
   - Increase Prometheus memory for better caching

2. **Log Ingestion**
   - Use structured JSON logging consistently
   - Enable log compression at source
   - Increase Loki ingester count for horizontal scaling
   - Use separate tenants for different log volumes

3. **Trace Ingestion**
   - Use tail sampling to reduce volume (keep errors/slow traces)
   - Batch spans at application level before sending
   - Enable compression for OTLP protocol
   - Use gRPC instead of HTTP for better performance

4. **General**
   - Use SSD storage for all components
   - Enable Prometheus remote storage for long-term retention
   - Implement circuit breakers for overload protection
   - Add caching layer for frequently queried data

### Capacity Planning

**Current Capacity (Baseline):**
- Metrics: 100K/sec
- Logs: 10K/sec
- Traces: 1K/sec

**Scaling Recommendations:**
- **2x Load:** Add 2 more Kubernetes nodes
- **5x Load:** Add 6 more nodes + enable sharding
- **10x Load:** Move to dedicated cluster + use distributed storage

**Storage Growth:**
- Metrics: 2GB/day × 90 days = 180GB
- Logs: 500GB/day × 30 days = 15TB
- Traces: 100GB/day × 7 days = 700GB
- **Total:** ~16TB for full retention

---

## Comparison to Industry Benchmarks

| Metric | Our Baseline | Industry Standard | Notes |
|--------|--------------|-------------------|-------|
| **Metrics Ingestion** | 100K/sec | 50-200K/sec | On par |
| **Log Ingestion** | 10K/sec | 10-50K/sec | Average |
| **Trace Ingestion** | 1K/sec | 1-10K/sec | Good for our scale |
| **Query Latency (P95)** | <500ms | <1000ms | Excellent |
| **Uptime SLA** | 99.9% | 99-99.9% | Standard |

---

## Change Log

| Date | Change | Impact |
|------|--------|--------|
| 2025-10-22 | Initial baselines defined | Baseline established |

---

**Maintainer:** DevOps Team
**Review Schedule:** Quarterly
**Next Review:** 2026-01-22
