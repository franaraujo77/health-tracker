# Prometheus Observability Stack - Operations Guide

This comprehensive guide covers security, testing, backup, monitoring, and capacity planning for the Prometheus observability stack.

## Table of Contents

1. [Security & RBAC](#security--rbac)
2. [Performance Testing](#performance-testing)
3. [Backup & Restore](#backup--restore)
4. [Self-Monitoring](#self-monitoring)
5. [Capacity Planning](#capacity-planning)

---

## Security & RBAC

### Authentication & Authorization

#### Basic Auth for Prometheus UI (Task 8)

**Setup Basic Authentication:**

1. Create password file:

```bash
# Generate bcrypt password hash
htpasswd -nBC 12 "" | tr -d ':\n'
# Enter password when prompted

# Create secret
kubectl create secret generic prometheus-basic-auth \
  -n observability \
  --from-literal=auth='admin:$2y$12$YOUR_BCRYPT_HASH_HERE'
```

2. Update Prometheus to use nginx-sidecar for auth:

```yaml
# Add to statefulset.yaml
- name: nginx-auth
  image: nginx:1.25-alpine
  ports:
    - name: https
      containerPort: 8443
  volumeMounts:
    - name: nginx-config
      mountPath: /etc/nginx/nginx.conf
      subPath: nginx.conf
    - name: basic-auth
      mountPath: /etc/nginx/.htpasswd
      subPath: auth
    - name: tls-certs
      mountPath: /etc/nginx/certs
```

#### TLS Configuration

**Generate Self-Signed Certificates (Development):**

```bash
# Generate CA
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 1024 -out ca.crt \
  -subj "/CN=Prometheus CA"

# Generate server certificate
openssl genrsa -out prometheus.key 2048
openssl req -new -key prometheus.key -out prometheus.csr \
  -subj "/CN=prometheus.observability.svc.cluster.local"

# Sign with CA
openssl x509 -req -in prometheus.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out prometheus.crt -days 825 -sha256

# Create secret
kubectl create secret tls prometheus-tls \
  -n observability \
  --cert=prometheus.crt \
  --key=prometheus.key
```

**Production: Use cert-manager:**

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: prometheus-tls
  namespace: observability
spec:
  secretName: prometheus-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - prometheus.health-tracker.example.com
```

#### RBAC Configuration

**Prometheus ServiceAccount Permissions (Already Configured):**

- Read-only access to Kubernetes resources
- No write permissions
- Minimal scope for service discovery

**Additional Security Hardening:**

```yaml
# NetworkPolicy to restrict access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: prometheus-netpol
  namespace: observability
spec:
  podSelector:
    matchLabels:
      app: prometheus
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow from Grafana
    - from:
        - namespaceSelector:
            matchLabels:
              name: observability
        - podSelector:
            matchLabels:
              app: grafana
      ports:
        - protocol: TCP
          port: 9090
    # Allow from Alertmanager
    - from:
        - podSelector:
            matchLabels:
              app: alertmanager
      ports:
        - protocol: TCP
          port: 9090
  egress:
    # Allow DNS
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
    # Allow scrape targets
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 8888  # OTel Collector
        - protocol: TCP
          port: 9090  # Self and peers
```

#### Audit Logging

**Enable Prometheus Audit Logging:**

```yaml
# Add to prometheus args
- --web.enable-admin-api
- --log.level=info
- --log.format=json

# Stream logs to centralized system
# Configure in your logging stack (e.g., Fluentd, Loki)
```

---

## Performance Testing

### Query Performance Validation (Task 9)

#### Test Dashboard Queries (<2s for 24h range)

**Performance Test Script:**

```bash
#!/bin/bash
# prometheus-perf-test.sh

PROMETHEUS_URL="http://localhost:9090"
TEST_QUERIES=(
  'rate(http_requests_total[5m])'
  'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))'
  'sum(rate(http_requests_total[5m])) by (service)'
  'avg(rate(node_cpu_seconds_total{mode!="idle"}[5m])) by (instance)'
)

echo "=== Prometheus Performance Test ==="
echo "Testing queries over 24h range..."
echo

for query in "${TEST_QUERIES[@]}"; do
  echo "Query: $query"

  start_time=$(date +%s)
  response=$(curl -s -G "${PROMETHEUS_URL}/api/v1/query" \
    --data-urlencode "query=${query}" \
    --data-urlencode "time=$(date +%s)" \
    -w "\nHTTP_CODE:%{http_code}\nTIME_TOTAL:%{time_total}\n")

  http_code=$(echo "$response" | grep "HTTP_CODE" | cut -d: -f2)
  time_total=$(echo "$response" | grep "TIME_TOTAL" | cut -d: -f2)

  if [ "$http_code" == "200" ]; then
    if (( $(echo "$time_total < 2.0" | bc -l) )); then
      echo "✓ PASS - ${time_total}s"
    else
      echo "✗ FAIL - ${time_total}s (threshold: 2s)"
    fi
  else
    echo "✗ ERROR - HTTP $http_code"
  fi
  echo
done
```

#### Benchmark Heavy Aggregations

**Load Test with Prometheus Benchmark Tool:**

```bash
# Install promtool
go install github.com/prometheus/prometheus/cmd/promtool@latest

# Query benchmark
promtool query instant http://localhost:9090 \
  'sum(rate(http_requests_total[5m])) by (service, namespace)' \
  --time=$(date -d '1 hour ago' +%s)

# Range query benchmark
promtool query range http://localhost:9090 \
  'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))' \
  --start=$(date -d '24 hours ago' +%s) \
  --end=$(date +%s) \
  --step=60
```

#### Concurrent Query Load Test

**K6 Load Test Script:**

```javascript
// k6-prometheus-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp up
    { duration: '5m', target: 10 },  // Stay at 10 concurrent users
    { duration: '2m', target: 50 },  // Spike
    { duration: '5m', target: 50 },  // Stay at spike
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // P95 < 2s
  },
};

const BASE_URL = 'http://prometheus.observability.svc.cluster.local:9090';

export default function () {
  const queries = [
    'up',
    'rate(http_requests_total[5m])',
    'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
  ];

  const query = queries[Math.floor(Math.random() * queries.length)];

  const res = http.get(`${BASE_URL}/api/v1/query?query=${encodeURIComponent(query)}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
```

```bash
# Run load test
k6 run k6-prometheus-load.js
```

#### Memory Usage During Queries

**Monitor Query Memory:**

```promql
# Prometheus heap in use
prometheus_engine_query_duration_seconds{quantile="0.95"}

# Peak memory during queries
max_over_time(prometheus_process_resident_memory_bytes[1h])

# Query concurrency
prometheus_engine_queries_concurrent_max
```

**Performance Baselines:**

| Metric | Target | Acceptable | Action Threshold |
|--------|--------|------------|------------------|
| P95 query latency (24h) | <1s | <2s | >2s |
| P99 query latency | <2s | <5s | >5s |
| Query timeout rate | 0% | <0.1% | >0.1% |
| Concurrent queries | <20 | <50 | >50 |
| Memory per query | <100MB | <500MB | >500MB |

---

## Backup & Restore

### Automated Backup Strategy (Task 10)

#### Daily Snapshot CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: prometheus-backup
  namespace: observability
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: prometheus-backup
          containers:
            - name: backup
              image: health-tracker/prometheus:2.48.0
              command:
                - /bin/sh
                - -c
                - |
                  # Create snapshot
                  SNAPSHOT=$(wget -O- --post-data='' \
                    http://prometheus-0.prometheus.observability.svc.cluster.local:9090/api/v1/admin/tsdb/snapshot \
                    | jq -r '.data.name')

                  # Run backup script (uploads to S3)
                  /usr/local/bin/backup-prometheus.sh
              env:
                - name: PROMETHEUS_URL
                  value: "http://prometheus-0.prometheus.observability.svc.cluster.local:9090"
                - name: S3_BUCKET
                  value: "prometheus-backups"
                - name: AWS_ACCESS_KEY_ID
                  valueFrom:
                    secretKeyRef:
                      name: prometheus-backup-s3
                      key: access_key_id
                - name: AWS_SECRET_ACCESS_KEY
                  valueFrom:
                    secretKeyRef:
                      name: prometheus-backup-s3
                      key: secret_access_key
          restartPolicy: OnFailure
```

#### WAL Backup to S3

**Continuous WAL Archiving (handled by Thanos):**

Thanos sidecar automatically uploads 2h blocks to S3, providing continuous backup.

#### Restore Procedures

**Restore from Thanos S3:**

```bash
# 1. Scale down Prometheus
kubectl scale statefulset prometheus -n observability --replicas=0

# 2. Download blocks from S3
aws s3 sync s3://prometheus-long-term-storage/ /tmp/restore-blocks/

# 3. Copy to Prometheus PVC
kubectl run -n observability restore-helper \
  --image=busybox --restart=Never \
  --overrides='
{
  "spec": {
    "containers": [{
      "name": "restore",
      "image": "busybox",
      "command": ["sleep", "3600"],
      "volumeMounts": [{
        "name": "data",
        "mountPath": "/prometheus"
      }]
    }],
    "volumes": [{
      "name": "data",
      "persistentVolumeClaim": {
        "claimName": "prometheus-storage-prometheus-0"
      }
    }]
  }
}'

# 4. Copy blocks
kubectl cp /tmp/restore-blocks/ observability/restore-helper:/prometheus/

# 5. Clean up and restart
kubectl delete pod restore-helper -n observability
kubectl scale statefulset prometheus -n observability --replicas=2
```

**Restore from Snapshot:**

```bash
# Snapshot restore is same as above, but source is snapshot tarball
tar -xzf prometheus-backup-20240101-120000.tar.gz -C /tmp/restore-blocks/
# Then follow steps 3-5 above
```

#### Test Restore Procedure

**Quarterly Restore Test:**

```bash
#!/bin/bash
# test-prometheus-restore.sh

echo "=== Prometheus Restore Test ==="

# 1. Create test namespace
kubectl create namespace prometheus-restore-test

# 2. Deploy Prometheus from backup
# (Use same manifests but different namespace)

# 3. Verify data
ORIGINAL_SERIES=$(curl -s http://prometheus.observability:9090/api/v1/query?query=up | jq '.data.result | length')
RESTORED_SERIES=$(curl -s http://prometheus.prometheus-restore-test:9090/api/v1/query?query=up | jq '.data.result | length')

if [ "$ORIGINAL_SERIES" -eq "$RESTORED_SERIES" ]; then
  echo "✓ Restore successful - series count matches"
else
  echo "✗ Restore failed - series count mismatch"
fi

# 4. Cleanup
kubectl delete namespace prometheus-restore-test
```

---

## Self-Monitoring

### Prometheus Self-Monitoring Dashboard (Task 11)

#### Key Metrics to Monitor

**TSDB Statistics:**

```promql
# Storage size
prometheus_tsdb_storage_blocks_bytes

# Series count
prometheus_tsdb_head_series

# Samples appended rate
rate(prometheus_tsdb_head_samples_appended_total[5m])

# Compaction duration
prometheus_tsdb_compaction_duration_seconds
```

**Ingestion Metrics:**

```promql
# Samples per second
rate(prometheus_tsdb_head_samples_appended_total[5m])

# Metrics per second
rate(prometheus_tsdb_head_series_created_total[5m])

# Out of order samples (should be 0)
rate(prometheus_tsdb_out_of_order_samples_total[5m])
```

**Query Performance:**

```promql
# Query duration P95
histogram_quantile(0.95, rate(prometheus_engine_query_duration_seconds_bucket[5m]))

# Concurrent queries
prometheus_engine_queries_concurrent_max

# Query timeout rate
rate(prometheus_engine_query_log_failures_total{reason="timeout"}[5m])
```

**Rule Evaluation:**

```promql
# Rule evaluation duration
prometheus_rule_group_last_duration_seconds

# Rule evaluation failures
rate(prometheus_rule_evaluation_failures_total[5m])

# Recording rule samples
sum(rate(prometheus_rule_evaluations_total{rule_type="recording"}[5m]))
```

**Storage Projections:**

```promql
# Current storage usage
prometheus_tsdb_storage_blocks_bytes

# Estimated full date (days)
(
  (prometheus_tsdb_retention_limit_bytes - prometheus_tsdb_storage_blocks_bytes)
  /
  deriv(prometheus_tsdb_storage_blocks_bytes[1d])
) / 86400
```

#### Grafana Dashboard JSON

Save as `prometheus-self-monitoring-dashboard.json`:

```json
{
  "dashboard": {
    "title": "Prometheus Self-Monitoring",
    "panels": [
      {
        "title": "Ingestion Rate",
        "targets": [{
          "expr": "rate(prometheus_tsdb_head_samples_appended_total[5m])"
        }]
      },
      {
        "title": "Query P95 Latency",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(prometheus_engine_query_duration_seconds_bucket[5m]))"
        }]
      },
      {
        "title": "Storage Usage",
        "targets": [{
          "expr": "prometheus_tsdb_storage_blocks_bytes"
        }]
      },
      {
        "title": "Rule Evaluation Duration",
        "targets": [{
          "expr": "prometheus_rule_group_last_duration_seconds"
        }]
      }
    ]
  }
}
```

---

## Capacity Planning

### Storage Requirements (Task 12)

#### Calculate Storage Needs Per Metric

**Formula:**

```
storage_bytes = samples_per_day × retention_days × bytes_per_sample × active_series

samples_per_day = 86400 / scrape_interval
bytes_per_sample ≈ 1-2 bytes (with compression)
```

**Example Calculation:**

```
Assumptions:
- Scrape interval: 15s
- Active series: 10,000,000
- Retention: 90 days
- Bytes per sample: 2

Calculation:
samples_per_day = 86400 / 15 = 5,760
storage = 5,760 × 90 × 2 × 10,000,000
        = 10,368,000,000,000 bytes
        = 10.4 TB

With compression (40% efficiency):
storage = 10.4 TB × 0.4 = 4.16 TB
```

#### Scaling Strategies

**Vertical Scaling (Increase Resources):**

| Series Count | CPU | Memory | Storage |
|--------------|-----|--------|---------|
| 1M | 2 cores | 4Gi | 100GB |
| 5M | 4 cores | 8Gi | 500GB |
| 10M | 8 cores | 16Gi | 1TB |
| 20M+ | Consider federation |

**Horizontal Scaling (Federation):**

```yaml
# Regional Prometheus instances
- us-east-1-prometheus (handles us-east-1 metrics)
- us-west-2-prometheus (handles us-west-2 metrics)
- eu-west-1-prometheus (handles eu-west-1 metrics)

# Global Prometheus (federated)
- Scrapes aggregated metrics from regional instances
- Stores only high-level metrics
- Reduces cardinality by 90%
```

#### Retention Policy Guidelines

**Recommended Retention Tiers:**

| Tier | Resolution | Retention | Storage | Use Case |
|------|------------|-----------|---------|----------|
| Raw | 15s | 90 days | Local | Recent detailed analysis |
| 5m downsample | 5m | 1 year | S3 | Historical trends |
| 1h downsample | 1h | 3 years | S3 | Long-term capacity planning |

**Cost Comparison:**

```
Local Storage (90 days):
- 500GB × $0.10/GB/month = $50/month

S3 + Downsampling (3 years):
- Year 1 (5m): 100GB × $0.0125/GB/month = $1.25/month
- Year 2-3 (1h): 20GB × $0.004/GB/month = $0.08/month
- Total: ~$1.50/month vs $50/month (97% savings)
```

#### Cost Optimization Tips

**1. Reduce Cardinality:**

```yaml
# BAD: High cardinality label
metric{user_id="12345"}

# GOOD: Use exemplars instead
metric{tenant="acme"} # exemplar: user_id=12345
```

**2. Adjust Scrape Intervals:**

```yaml
# Critical services: 15s
scrape_interval: 15s

# Less critical: 60s (4x less storage)
scrape_interval: 60s
```

**3. Use Recording Rules:**

```yaml
# Pre-aggregate expensive queries
- record: job:api_requests:rate5m
  expr: sum(rate(http_requests_total[5m])) by (job)
```

**4. Implement Metric Relabeling:**

```yaml
# Drop unnecessary metrics
metric_relabel_configs:
  - source_labels: [__name__]
    regex: 'go_.*'  # Drop Go runtime metrics
    action: drop
```

#### Growth Projections

**Monthly Growth Analysis:**

```bash
# Calculate monthly growth rate
current_size=$(prometheus_tsdb_storage_blocks_bytes)
last_month_size=$(prometheus_tsdb_storage_blocks_bytes offset 30d)

growth_rate=$(( (current_size - last_month_size) / last_month_size × 100 ))

# Project storage needs
months_to_capacity=$(( (capacity_limit - current_size) / monthly_growth ))
```

**Capacity Planning Table:**

| Month | Expected Series | Storage Needed | Action |
|-------|----------------|----------------|--------|
| Current | 10M | 500GB | Baseline |
| +3 months | 15M | 750GB | Monitor |
| +6 months | 22M | 1.1TB | Increase PVC |
| +12 months | 35M | 1.75TB | Consider federation |

---

## Monitoring & Alerting

### Critical Alerts

**Storage Capacity:**

```yaml
- alert: PrometheusStorageNearFull
  expr: (prometheus_tsdb_storage_blocks_bytes / prometheus_tsdb_retention_limit_bytes) > 0.85
  for: 30m
  annotations:
    summary: "Prometheus storage is 85% full"
```

**Performance Degradation:**

```yaml
- alert: PrometheusSlowQueries
  expr: histogram_quantile(0.95, rate(prometheus_engine_query_duration_seconds_bucket[5m])) > 10
  for: 15m
  annotations:
    summary: "P95 query latency >10s"
```

---

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Capacity Planning Guide](https://prometheus.io/docs/prometheus/latest/storage/)
- [Security Guide](https://prometheus.io/docs/operating/security/)
