# OpenTelemetry Collector Runbook

**Service**: OpenTelemetry Collector
**Team**: Platform/DevOps
**On-Call**: See PagerDuty rotation
**Slack**: #observability-alerts

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Architecture Overview](#architecture-overview)
3. [Deployment Procedures](#deployment-procedures)
4. [Upgrade Procedures](#upgrade-procedures)
5. [Configuration Management](#configuration-management)
6. [Common Issues & Solutions](#common-issues--solutions)
7. [Performance Tuning](#performance-tuning)
8. [Disaster Recovery](#disaster-recovery)
9. [Monitoring & Alerts](#monitoring--alerts)
10. [Emergency Contacts](#emergency-contacts)

---

## Quick Reference

### Essential Commands

```bash
# Check collector status
kubectl get pods -n observability -l app=otel-collector

# View logs (all pods)
kubectl logs -n observability -l app=otel-collector -f --all-containers

# View logs (specific pod)
kubectl logs -n observability otel-collector-<pod-id> -f

# Check metrics endpoint
kubectl port-forward -n observability svc/otel-collector 8888:8888
curl http://localhost:8888/metrics

# Restart collector (rolling restart)
kubectl rollout restart deployment/otel-collector -n observability

# Check HPA status
kubectl get hpa -n observability otel-collector

# Run load test
kubectl apply -f tests/load-test-job.yaml

# View Grafana dashboard
# Navigate to: Grafana → Dashboards → OpenTelemetry Collector
```

### Key Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| **Data Loss** | 0/s | 0/s | > 0/s |
| **Queue Size** | < 200 | 200-500 | > 500 |
| **CPU Usage** | < 70% | 70-85% | > 85% |
| **Memory Usage** | < 70% | 70-85% | > 85% |
| **Export Failures** | 0% | < 0.1% | > 0.1% |
| **Pod Count** | 3 | 2 | < 2 |

### Emergency Actions

| Situation | Immediate Action |
|-----------|------------------|
| **All pods down** | Check node health, restart deployment |
| **Data loss** | Scale up pods, increase resource limits |
| **High latency** | Check downstream systems, scale collectors |
| **Memory leak** | Rolling restart, investigate in lower env |
| **Config error** | Rollback to previous version |

---

## Architecture Overview

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    CI/CD Pipeline                           │
│              (GitHub Actions Workflows)                     │
└────────────────────┬────────────────────────────────────────┘
                     │ OTLP (gRPC/HTTP)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              OpenTelemetry Collector                        │
│  ┌──────────┐  ┌─────────────┐  ┌───────────┐             │
│  │Receivers │→ │ Processors  │→ │ Exporters │             │
│  │ - OTLP   │  │ - Batch     │  │ - Prom    │             │
│  │ - Prom   │  │ - MemLimit  │  │ - Tempo   │             │
│  └──────────┘  │ - K8sAttrs  │  │ - Loki    │             │
│                │ - ResDetect │  └───────────┘             │
│                └─────────────┘                             │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │   Extensions                        │                   │
│  │   - Health Check (port 13133)      │                   │
│  │   - Bearer Auth                     │                   │
│  │   - zPages (port 55679)            │                   │
│  └─────────────────────────────────────┘                   │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
    ┌─────────┐ ┌──────┐  ┌──────┐
    │Prometheus│ │Tempo │  │ Loki │
    └─────────┘ └──────┘  └──────┘
```

### Deployment Configuration

- **Replicas**: 3 (min: 2, max: 10 via HPA)
- **Resources**:
  - Requests: 500m CPU, 512Mi memory
  - Limits: 2 CPU, 2Gi memory
- **Anti-Affinity**: Pods spread across nodes
- **Service Account**: otel-collector (with K8s API permissions)
- **Storage**: Stateless (no persistent volumes)

### Network Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 4317 | gRPC | OTLP receiver (primary) |
| 4318 | HTTP | OTLP receiver (alternative) |
| 8888 | HTTP | Prometheus metrics |
| 8889 | HTTP | Prometheus exporter |
| 13133 | HTTP | Health check |
| 55679 | HTTP | zPages (debugging) |

---

## Deployment Procedures

### Prerequisites

- [ ] Kubernetes cluster with sufficient capacity
- [ ] `kubectl` configured with cluster access
- [ ] Namespace `observability` exists
- [ ] cert-manager installed (for TLS certificates)
- [ ] Prometheus and downstream systems deployed

### Initial Deployment

```bash
# 1. Create namespace
kubectl create namespace observability

# 2. Generate authentication token
kubectl create secret generic otel-collector-auth \
  --from-literal=bearer-token=$(openssl rand -hex 32) \
  -n observability

# 3. Generate TLS certificates (for development)
cd infrastructure/kubernetes/otel-collector/certs
chmod +x generate-dev-certs.sh
./generate-dev-certs.sh

kubectl create secret tls otel-collector-tls \
  --cert=server.crt \
  --key=server.key \
  -n observability

kubectl create secret generic otel-collector-ca \
  --from-file=ca.crt=ca.crt \
  -n observability

# 4. Deploy collector
kubectl apply -k infrastructure/kubernetes/otel-collector/

# 5. Verify deployment
kubectl get pods -n observability -l app=otel-collector
kubectl get svc -n observability otel-collector
kubectl get hpa -n observability otel-collector

# 6. Check logs for errors
kubectl logs -n observability -l app=otel-collector --tail=50

# 7. Verify metrics endpoint
kubectl port-forward -n observability svc/otel-collector 8888:8888
curl http://localhost:8888/metrics | grep otelcol_receiver

# 8. Run smoke test
kubectl apply -f infrastructure/kubernetes/otel-collector/tests/load-test-job.yaml
kubectl logs -n observability -l app=otel-collector-load-test -f
```

### Validation Checklist

After deployment, verify:

- [ ] All 3 pods are Running
- [ ] Health check returns 200 OK
- [ ] Metrics endpoint accessible
- [ ] OTLP receivers accepting connections
- [ ] Exporters successfully sending data
- [ ] HPA min/max replicas configured
- [ ] PodDisruptionBudget active
- [ ] Grafana dashboard shows data
- [ ] No error logs in past 5 minutes
- [ ] Load test passes

### Post-Deployment

```bash
# Import Grafana dashboard
kubectl create configmap grafana-dashboard-otel-collector \
  --from-file=infrastructure/grafana/dashboards/otel-collector-dashboard.json \
  -n observability
kubectl label configmap grafana-dashboard-otel-collector grafana_dashboard=1 -n observability

# Enable scheduled load tests
kubectl apply -f infrastructure/kubernetes/otel-collector/tests/load-test-job.yaml

# Set up Prometheus alerts
kubectl apply -f infrastructure/monitoring/alerts/otel-collector-alerts.yaml
```

---

## Upgrade Procedures

### Before Upgrading

1. **Review Release Notes**: Check for breaking changes
2. **Backup Configuration**: `kubectl get configmap otel-collector-config -n observability -o yaml > backup.yaml`
3. **Run Load Test**: Establish baseline performance
4. **Check Dependencies**: Ensure downstream systems are healthy
5. **Schedule Maintenance Window**: If possible (though zero-downtime upgrade)

### Upgrade Steps

#### Option 1: Rolling Update (Recommended)

```bash
# 1. Update image tag in kustomization.yaml
cd infrastructure/kubernetes/otel-collector
vi kustomization.yaml
# Change: newTag: 0.96.0 → newTag: 0.97.0

# 2. Preview changes
kubectl diff -k .

# 3. Apply update (rolling restart)
kubectl apply -k .

# 4. Monitor rollout
kubectl rollout status deployment/otel-collector -n observability

# 5. Watch pod restart
kubectl get pods -n observability -l app=otel-collector -w

# 6. Check for errors
kubectl logs -n observability -l app=otel-collector --tail=100 | grep -i error

# 7. Verify metrics
kubectl port-forward -n observability svc/otel-collector 8888:8888
curl http://localhost:8888/metrics | head -20

# 8. Run load test
kubectl apply -f tests/load-test-job.yaml
```

#### Option 2: Blue-Green Deployment

```bash
# 1. Deploy new version with different name
kubectl apply -k . --namespace observability-staging

# 2. Run full test suite against staging
./run-all-tests.sh observability-staging

# 3. Switch traffic (update service selector)
kubectl patch service otel-collector -n observability \
  -p '{"spec":{"selector":{"version":"v0.97.0"}}}'

# 4. Monitor for 10 minutes

# 5. Delete old deployment
kubectl delete deployment otel-collector-old -n observability
```

### Rollback Procedure

If upgrade fails:

```bash
# Option 1: Rollback deployment
kubectl rollout undo deployment/otel-collector -n observability

# Option 2: Revert kustomization
git checkout HEAD~1 infrastructure/kubernetes/otel-collector/kustomization.yaml
kubectl apply -k infrastructure/kubernetes/otel-collector/

# Option 3: Restore from backup
kubectl apply -f backup.yaml
kubectl rollout restart deployment/otel-collector -n observability
```

### Post-Upgrade Validation

- [ ] All pods healthy
- [ ] Load test passes
- [ ] Grafana dashboard shows normal metrics
- [ ] No increase in error rate
- [ ] Resource usage within normal range
- [ ] Downstream systems receiving data

---

## Configuration Management

### Configuration Files

| File | Purpose | Restart Required |
|------|---------|------------------|
| `configmap.yaml` | Collector pipeline config | Yes |
| `deployment.yaml` | K8s deployment spec | Yes |
| `hpa.yaml` | Auto-scaling config | No |
| `serviceaccount.yaml` | RBAC permissions | No |

### Configuration Best Practices

#### 1. Version Control

- **Always commit changes** to git before applying
- **Use feature branches** for major config changes
- **Require PR review** for production changes

#### 2. Testing Changes

```bash
# Validate YAML syntax
kubectl apply -k . --dry-run=client

# Test in staging first
kubectl apply -k . --namespace observability-staging

# Run load test
kubectl apply -f tests/load-test-job.yaml
```

#### 3. Common Configuration Changes

**Increase Batch Size** (improve throughput):

```yaml
processors:
  batch:
    timeout: 5s          # Decrease from 10s
    send_batch_size: 2048  # Increase from 1024
```

**Increase Memory Limit** (reduce drops):

```yaml
resources:
  limits:
    memory: 3Gi  # Up from 2Gi

processors:
  memory_limiter:
    limit_mib: 2560  # 2.5 GB (leave headroom)
    spike_limit_mib: 1920  # 75% of limit
```

**Add New Exporter**:

```yaml
exporters:
  otlp/new-backend:
    endpoint: new-backend.observability.svc.cluster.local:4317
    tls:
      insecure: false
      ca_file: /etc/otel/tls/ca.crt
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 1000

service:
  pipelines:
    traces:
      exporters: [logging, otlp/traces, otlp/new-backend]  # Add new exporter
```

### Configuration Validation

```bash
# Run all validation tests
cd infrastructure/kubernetes/otel-collector/tests

./validate-hpa.sh
./validate-resource-detection.sh

# Lint YAML
yamllint ../configmap.yaml

# Check for common mistakes
grep -n "insecure: true" ../configmap.yaml  # Should use TLS in prod
grep -n "override: true" ../configmap.yaml  # Can cause unexpected behavior
```

---

## Common Issues & Solutions

### Issue 1: Pods Crashing (CrashLoopBackOff)

**Symptoms**:
```bash
kubectl get pods -n observability
# otel-collector-xxx  0/1  CrashLoopBackOff
```

**Diagnosis**:
```bash
# Check logs
kubectl logs -n observability otel-collector-xxx --previous

# Common errors:
# - "failed to get config: ..." → Configuration syntax error
# - "cannot bind to port ..." → Port conflict
# - "OOMKilled" → Insufficient memory
```

**Solutions**:

**Config Error**:
```bash
# Validate config locally
docker run --rm -v $(pwd)/otel-collector-config.yaml:/config.yaml \
  otel/opentelemetry-collector-contrib:0.96.0 \
  validate --config=/config.yaml

# Fix and redeploy
kubectl apply -k infrastructure/kubernetes/otel-collector/
```

**OOMKilled**:
```yaml
# Increase memory limit in deployment.yaml
resources:
  limits:
    memory: 3Gi  # Up from 2Gi
```

**Port Conflict**:
```bash
# Check if another service using same port
kubectl get svc -n observability
# Adjust port in service.yaml if needed
```

### Issue 2: Data Loss (Dropped Spans/Metrics/Logs)

**Symptoms**:
```bash
# Prometheus query shows drops
otelcol_processor_dropped_spans > 0
```

**Diagnosis**:
```bash
# Check which processor is dropping
kubectl port-forward -n observability svc/otel-collector 8888:8888
curl http://localhost:8888/metrics | grep dropped

# Check resource usage
kubectl top pods -n observability -l app=otel-collector

# Check queue sizes
curl http://localhost:8888/metrics | grep queue_size
```

**Root Causes & Solutions**:

**Memory Limiter Triggered**:
```yaml
# Solution: Increase memory limit
resources:
  limits:
    memory: 3Gi

processors:
  memory_limiter:
    limit_mib: 2560
    spike_limit_mib: 1920
```

**Exporter Queue Full**:
```yaml
# Solution: Increase queue size and consumers
exporters:
  otlp/traces:
    sending_queue:
      queue_size: 2000  # Up from 1000
      num_consumers: 20  # Up from 10
```

**Downstream System Slow**:
```bash
# Check downstream health
kubectl get pods -n observability tempo
kubectl logs -n observability tempo-0 --tail=50

# Temporary mitigation: Increase queue size
# Long-term: Scale downstream system
```

### Issue 3: High Latency

**Symptoms**:
- P99 latency > 320ms
- Grafana dashboard shows slow processing

**Diagnosis**:
```bash
# Check CPU throttling
kubectl top pods -n observability -l app=otel-collector

# Check batch sizes
curl http://localhost:8888/metrics | grep batch_send_size
```

**Solutions**:

**CPU Throttling**:
```yaml
resources:
  limits:
    cpu: 3000m  # Increase from 2000m
```

**Inefficient Batching**:
```yaml
processors:
  batch:
    timeout: 5s  # Reduce from 10s for faster export
    send_batch_size: 2048  # Increase for fewer exports
```

**Network Latency**:
```bash
# Test network to downstream
kubectl exec -n observability otel-collector-xxx -- \
  curl -o /dev/null -s -w '%{time_total}' \
  http://tempo.observability.svc.cluster.local:4317

# If > 100ms, investigate network
```

### Issue 4: HPA Not Scaling

**Symptoms**:
- CPU/memory high but pod count stays at 3
- `kubectl get hpa` shows "unknown" for metrics

**Diagnosis**:
```bash
kubectl get hpa -n observability otel-collector
kubectl describe hpa -n observability otel-collector

# Check metrics-server
kubectl get deployment metrics-server -n kube-system
kubectl logs -n kube-system -l k8s-app=metrics-server
```

**Solutions**:

**Metrics Server Not Running**:
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

**HPA Can't Read Metrics**:
```bash
# Check RBAC
kubectl auth can-i get pods --as=system:serviceaccount:kube-system:horizontal-pod-autoscaler -n observability

# Fix if needed
kubectl apply -f infrastructure/kubernetes/otel-collector/serviceaccount.yaml
```

**Wrong Metrics Target**:
```yaml
# Verify targets are realistic
spec:
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70  # Not 700!
```

### Issue 5: Export Failures

**Symptoms**:
```bash
# High failure rate
otelcol_exporter_send_failed_spans > 0
```

**Diagnosis**:
```bash
# Check exporter logs
kubectl logs -n observability otel-collector-xxx | grep -i "export.*error"

# Common errors:
# - "connection refused" → Downstream not reachable
# - "authentication failed" → Invalid credentials
# - "deadline exceeded" → Timeout (downstream too slow)
```

**Solutions**:

**Connection Refused**:
```bash
# Check downstream service
kubectl get svc -n observability tempo
kubectl get pods -n observability tempo-0

# Test connectivity
kubectl exec -n observability otel-collector-xxx -- \
  nc -zv tempo.observability.svc.cluster.local 4317
```

**Authentication Failed**:
```bash
# Rotate bearer token
kubectl create secret generic otel-collector-auth-new \
  --from-literal=bearer-token=$(openssl rand -hex 32) \
  -n observability

# Update deployment to use new secret
kubectl set env deployment/otel-collector -n observability \
  AUTH_SECRET=otel-collector-auth-new

# Rollout restart
kubectl rollout restart deployment/otel-collector -n observability
```

**Deadline Exceeded**:
```yaml
# Increase timeout
exporters:
  otlp/traces:
    timeout: 60s  # Up from 30s
    retry_on_failure:
      max_elapsed_time: 600s  # Up from 300s
```

---

## Performance Tuning

### Optimization Goals

| Metric | Current | Target | How to Achieve |
|--------|---------|--------|----------------|
| Throughput | 10K spans/s | 20K spans/s | Increase batch size, add pods |
| Latency P99 | 200ms | < 100ms | Reduce batch timeout, add CPU |
| CPU per pod | 1.2 cores | < 1 core | Optimize processors, fewer labels |
| Memory per pod | 1GB | < 800MB | Reduce batch size, tune memory limiter |

### Tuning Guidelines

#### High Throughput (Maximize Data Rate)

```yaml
processors:
  batch:
    timeout: 5s  # Shorter timeout = faster export
    send_batch_size: 4096  # Larger batches = fewer exports
    send_batch_max_size: 8192

  memory_limiter:
    limit_mib: 2560  # Higher limit = more buffering
    spike_limit_mib: 2048

exporters:
  otlp/traces:
    sending_queue:
      num_consumers: 30  # More workers = higher throughput
      queue_size: 5000  # Larger queue = handle bursts

resources:
  requests:
    cpu: 1000m  # More CPU = faster processing
    memory: 1Gi
  limits:
    cpu: 3000m
    memory: 3Gi
```

#### Low Latency (Minimize Processing Time)

```yaml
processors:
  batch:
    timeout: 1s  # Export immediately
    send_batch_size: 512  # Smaller batches = lower latency

exporters:
  otlp/traces:
    timeout: 5s  # Fail fast
    compression: none  # Skip compression for speed

resources:
  limits:
    cpu: 4000m  # Plenty of CPU to avoid queuing
```

#### Low Resource Usage (Minimize Cost)

```yaml
spec:
  replicas: 2  # Minimum for HA

processors:
  batch:
    timeout: 30s  # Batch aggressively
    send_batch_size: 8192

  # Remove unnecessary processors
  # k8s_attributes: {}  # Comment out if not needed

resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

### Performance Benchmarking

```bash
# Run load test with different configs
for batch_size in 512 1024 2048 4096; do
  echo "Testing batch_size=$batch_size"

  # Update config
  yq eval ".processors.batch.send_batch_size = $batch_size" -i configmap.yaml
  kubectl apply -k .
  sleep 60  # Let pods restart

  # Run test
  kubectl apply -f tests/load-test-job.yaml
  sleep 120  # Wait for completion

  # Collect results
  kubectl logs -n observability -l app=otel-collector-load-test > results-$batch_size.log
done

# Compare results
grep "Throughput" results-*.log
```

---

## Disaster Recovery

### Backup Procedures

#### What to Backup

- Configuration files (version controlled in git)
- TLS certificates and keys
- Authentication tokens
- Grafana dashboards

#### Manual Backup

```bash
# Backup all resources
kubectl get all,configmap,secret,hpa,pdb -n observability -o yaml > backup-$(date +%Y%m%d).yaml

# Backup configuration only
kubectl get configmap otel-collector-config -n observability -o yaml > config-backup.yaml

# Backup secrets (encrypted)
kubectl get secret -n observability -o yaml | gpg --encrypt > secrets-backup.yaml.gpg
```

#### Automated Backup (with Velero)

```bash
# Install Velero
velero install --provider aws --bucket otel-backups --use-restic

# Create backup schedule
velero schedule create otel-collector-daily \
  --schedule="0 2 * * *" \
  --include-namespaces observability \
  --include-resources pods,configmaps,secrets,deployments

# List backups
velero backup get
```

### Recovery Procedures

#### Scenario 1: Accidental Deletion

```bash
# Restore from git
git checkout main
kubectl apply -k infrastructure/kubernetes/otel-collector/

# Verify
kubectl get pods -n observability
```

#### Scenario 2: Namespace Deleted

```bash
# Restore entire namespace
kubectl create namespace observability
kubectl apply -f backup-YYYYMMDD.yaml

# Or use Velero
velero restore create --from-backup otel-collector-daily-20250121
```

#### Scenario 3: Cluster Failure

```bash
# 1. Provision new cluster
# 2. Install prerequisites (cert-manager, etc.)
# 3. Restore from git
git clone <repo>
cd infrastructure/kubernetes/otel-collector
kubectl apply -k .

# 4. Restore secrets from encrypted backup
gpg --decrypt secrets-backup.yaml.gpg | kubectl apply -f -

# 5. Validate
kubectl get pods -n observability
./tests/load-test.sh
```

#### Scenario 4: Data Loss (Collector Misconfiguration)

**Problem**: Collector dropped 1 hour of telemetry due to misconfiguration

**Impact Assessment**:
- Spans: Can't recover (transient data)
- Metrics: May be recoverable from source systems
- Logs: May be recoverable from log files

**Mitigation** (for future):
```yaml
# Enable dead letter queue
processors:
  batch:
    send_batch_size: 1024
    timeout: 10s

exporters:
  # Primary export
  otlp/traces:
    endpoint: tempo:4317

  # Backup export to S3 (for recovery)
  file:
    path: /var/log/otel/traces
    rotation:
      max_megabytes: 100
      max_days: 7
```

### Recovery Time Objectives (RTO)

| Scenario | Target RTO | Procedure |
|----------|-----------|-----------|
| Single pod failure | < 1 min | Automatic (K8s self-healing) |
| Config rollback | < 5 min | `kubectl rollout undo` |
| Full deployment restore | < 15 min | `kubectl apply -k .` |
| Namespace recovery | < 30 min | Restore from backup |
| Cluster disaster | < 2 hours | New cluster + restore |

---

## Monitoring & Alerts

### Key Metrics to Monitor

| Metric | Alert Threshold | Action |
|--------|----------------|--------|
| `otelcol_processor_dropped_spans` | > 0 for 5m | Scale up or increase limits |
| `otelcol_exporter_queue_size` | > 800 for 5m | Check downstream systems |
| `otelcol_exporter_send_failed_spans` | > 1% for 5m | Investigate export failures |
| `container_memory_working_set_bytes` | > 90% for 10m | Increase memory limits |
| `container_cpu_usage_seconds_total` | > 90% for 10m | Increase CPU limits or scale |
| `up{job="otel-collector"}` | < 2 for 2m | Critical: Check pod health |

### Grafana Dashboards

- **OpenTelemetry Collector** (`uid: otel-collector-health-tracker`)
  - Data ingestion rates
  - Export success/failure
  - Resource utilization
  - Processing latencies

### Alert Runbook Links

All alerts should link back to this runbook:

```yaml
annotations:
  runbook_url: "https://github.com/yourorg/health-tracker/blob/main/infrastructure/kubernetes/otel-collector/RUNBOOK.md#issue-2-data-loss"
```

---

## Emergency Contacts

| Role | Contact | Escalation Path |
|------|---------|-----------------|
| **Primary On-Call** | PagerDuty | Auto-escalates after 15 min |
| **Platform Team Lead** | Jane Doe | Escalate for architecture decisions |
| **DevOps Manager** | John Smith | Escalate for resource allocation |
| **Slack Channel** | #observability-alerts | Post updates here |

### Escalation Policy

1. **Severity 3** (Minor): On-call handles, no escalation needed
2. **Severity 2** (Major): On-call + Team Lead after 30 min
3. **Severity 1** (Critical): Immediate escalation to Team Lead + Manager

---

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-21 | 1.0 | Initial runbook creation | Claude |
| | | Added deployment procedures | |
| | | Added troubleshooting guide | |
| | | Added disaster recovery | |
