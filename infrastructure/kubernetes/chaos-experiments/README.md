# Chaos Engineering for Observability Stack

## Overview

Chaos engineering experiments to validate observability stack resilience. Tests system behavior under failure conditions including pod failures, network issues, resource exhaustion, and disk problems.

## Features

- ✅ **Pod Failure Tests** - Kill/restart pods to test recovery
- ✅ **Network Chaos** - Partition, delay, packet loss, bandwidth limits
- ✅ **Resource Stress** - CPU/memory exhaustion scenarios
- ✅ **I/O Chaos** - Disk latency and space exhaustion
- ✅ **Comprehensive Workflow** - Automated end-to-end testing
- ✅ **Recovery Validation** - Automated health checks
- ✅ **Detailed Reporting** - JSON results with metrics

## Prerequisites

### Install Chaos Mesh

```bash
# Add Chaos Mesh Helm repository
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update

# Install Chaos Mesh
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-mesh \
  --create-namespace \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock

# Verify installation
kubectl get pods -n chaos-mesh
```

### Verify Observability Stack

```bash
# Check all components are running
kubectl get pods -n observability

# Expected: prometheus, loki, tempo, grafana, alertmanager, otel-collector
```

## Quick Start

### Run Individual Tests

```bash
# Pod failure test
./run-chaos-test.sh pod-failure

# Network chaos test
./run-chaos-test.sh network

# Resource stress test
./run-chaos-test.sh stress

# OTel Collector chaos
./run-chaos-test.sh otel
```

### Run Comprehensive Test

```bash
# Runs all chaos scenarios in sequence (30+ minutes)
./run-chaos-test.sh comprehensive
```

## Chaos Experiments

### 1. Pod Failure - Prometheus

**File:** `pod-failure-prometheus.yaml`

**Scenarios:**
- **pod-kill**: Kills Prometheus pod instantly
- **pod-failure**: Makes pod fail for 2 minutes
- **container-kill**: Kills Prometheus container only

**Expected Behavior:**
- Kubernetes restarts pod within 30 seconds
- Prometheus recovers and resumes scraping
- No data loss (WAL recovery)
- Alerts fire if recovery takes >2 minutes

**Validation:**
```bash
kubectl apply -f pod-failure-prometheus.yaml

# Wait and verify recovery
kubectl wait --for=condition=ready pod -l app=prometheus -n observability --timeout=120s

# Check Prometheus is healthy
kubectl exec -n observability deploy/prometheus -- wget -q -O- http://localhost:9090/-/healthy
```

**Recovery Time:** <1 minute

### 2. Network Chaos - Loki

**File:** `network-chaos-loki.yaml`

**Scenarios:**
- **partition**: Network partition from Prometheus/Grafana for 3 min
- **delay**: Add 500ms latency with 200ms jitter for 5 min
- **loss**: 25% packet loss for 3 min
- **bandwidth**: Limit to 1 Mbps for 5 min

**Expected Behavior:**
- Loki buffers incoming logs during partition
- Queries timeout during network issues
- System recovers when network restored
- No permanent data loss

**Validation:**
```bash
kubectl apply -f network-chaos-loki.yaml

# Monitor Loki logs
kubectl logs -f -n observability deploy/loki

# Verify recovery
kubectl exec -n observability deploy/prometheus -- wget -q -O- http://loki:3100/ready
```

**Recovery Time:** <2 minutes after chaos ends

### 3. Stress Chaos - Tempo

**File:** `stress-chaos-tempo.yaml`

**Scenarios:**
- **cpu-stress**: 80% CPU load with 4 workers for 5 min
- **memory-stress**: 1GB memory allocation for 5 min
- **disk-slow**: 500ms I/O latency on 50% of operations
- **disk-full**: Simulate disk full (ENOSPC) for 2 min

**Expected Behavior:**
- Tempo performance degrades but continues operating
- Trace ingestion slows but doesn't fail
- Kubernetes may kill pod if OOM
- Recovery after stress ends

**Validation:**
```bash
kubectl apply -f stress-chaos-tempo.yaml

# Monitor resource usage
kubectl top pod -n observability -l app=tempo

# Check for OOM kills
kubectl get events -n observability | grep OOM

# Verify recovery
kubectl exec -n observability deploy/prometheus -- wget -q -O- http://tempo:3200/ready
```

**Recovery Time:** <3 minutes

### 4. OTel Collector Chaos

**File:** `otel-collector-chaos.yaml`

**Scenarios:**
- **pod-kill**: Kill all OTel Collector pods
- **cpu-spike**: 95% CPU load for 3 minutes
- **network-corruption**: 10% packet corruption for 5 minutes

**Expected Behavior:**
- Telemetry data buffered during downtime
- Clients retry with backoff
- Multi-pod deployment maintains availability
- No data loss on recovery

**Validation:**
```bash
kubectl apply -f otel-collector-chaos.yaml

# Monitor pod restarts
kubectl get pods -n observability -l app=otel-collector -w

# Check health endpoint
kubectl exec -n observability deploy/prometheus -- wget -q -O- http://otel-collector:13133
```

**Recovery Time:** <2 minutes

### 5. Comprehensive Workflow

**File:** `comprehensive-chaos-scenario.yaml`

**Test Sequence:**
1. Capture baseline metrics
2. Prometheus pod failure (2 min)
3. Verify Prometheus recovery (5 min timeout)
4. Loki network partition (3 min)
5. Verify Loki recovery (3 min timeout)
6. Tempo resource stress (5 min)
7. Verify Tempo recovery (3 min timeout)
8. OTel Collector chaos (1 min)
9. Verify OTel recovery (3 min timeout)
10. Final validation of all services

**Total Duration:** ~30 minutes

**Expected Behavior:**
- All components recover automatically
- No manual intervention required
- Monitoring continues throughout
- All services healthy at end

**Execution:**
```bash
kubectl apply -f comprehensive-chaos-scenario.yaml

# Monitor workflow progress
kubectl get workflow observability-stack-chaos-test -n observability -w

# View workflow details
kubectl describe workflow observability-stack-chaos-test -n observability

# Check logs
kubectl logs -n observability -l workflow=observability-stack-chaos-test -f
```

**Success Criteria:**
- All workflow steps complete successfully
- No services remain degraded
- No data loss detected
- All alerts clear after recovery

## Monitoring During Chaos

### View Active Experiments

```bash
# List all chaos experiments
kubectl get podchaos,networkchaos,stresschaos,iochaos -n observability

# Get details
kubectl describe podchaos prometheus-pod-kill -n observability
```

### Monitor Component Health

```bash
# Watch pod status
kubectl get pods -n observability -w

# Check logs for errors
kubectl logs -f -n observability deploy/prometheus
kubectl logs -f -n observability deploy/loki
kubectl logs -f -n observability deploy/tempo

# Monitor metrics in Grafana
# Navigate to Operations Dashboard
# Watch for spikes in error rates
```

### Check Alerts

```bash
# View active alerts
kubectl exec -n observability prometheus-0 -- \
  wget -q -O- http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.state == "firing")'

# Check AlertManager
kubectl port-forward -n observability svc/alertmanager 9093:9093
# Open http://localhost:9093
```

## Safety Measures

### Blast Radius Limitation

Chaos experiments are configured with:
- **mode: one** - Affects only one pod
- **mode: fixed** with **value: "1"** - Explicit single target
- **duration** limits - Auto-recovery after timeout
- **namespace isolation** - Only affects observability namespace

### Emergency Stop

```bash
# Delete all chaos experiments immediately
kubectl delete podchaos,networkchaos,stresschaos,iochaos --all -n observability

# Or delete specific experiment
kubectl delete podchaos prometheus-pod-kill -n observability
```

### Rollback

```bash
# If system doesn't recover, force pod recreation
kubectl rollout restart deployment/prometheus -n observability
kubectl rollout restart deployment/loki -n observability
kubectl rollout restart deployment/tempo -n observability

# Check rollout status
kubectl rollout status deployment/prometheus -n observability
```

## Best Practices

1. **Start Small** - Run individual tests before comprehensive
2. **Non-Production First** - Test in staging before production
3. **Monitor Closely** - Watch dashboards during experiments
4. **Document Results** - Keep log of experiments and outcomes
5. **Schedule Appropriately** - Avoid peak hours
6. **Communicate** - Notify team before running chaos tests
7. **Verify Recovery** - Don't assume success, validate
8. **Clean Up** - Remove experiments after completion
9. **Review Alerts** - Check if appropriate alerts fired
10. **Iterate** - Improve based on learnings

## Troubleshooting

### Chaos Experiment Won't Start

**Symptoms:** Experiment created but no effect observed

**Investigation:**
```bash
# Check experiment status
kubectl get podchaos prometheus-pod-kill -n observability -o yaml

# Check Chaos Mesh controller logs
kubectl logs -n chaos-mesh -l app.kubernetes.io/component=controller-manager

# Verify RBAC permissions
kubectl auth can-i create podchaos --namespace observability
```

**Common Causes:**
- Chaos Mesh not properly installed
- Insufficient RBAC permissions
- Selector doesn't match any pods
- Namespace mismatch

### System Doesn't Recover

**Symptoms:** Component remains degraded after chaos ends

**Investigation:**
```bash
# Check pod status and events
kubectl describe pod -n observability -l app=prometheus

# Check logs for errors
kubectl logs -n observability -l app=prometheus --tail=100

# Check resource constraints
kubectl top pod -n observability

# Check PersistentVolumeClaims
kubectl get pvc -n observability
```

**Resolution:**
```bash
# Force pod recreation
kubectl delete pod -n observability -l app=prometheus

# Scale down and up
kubectl scale deployment/prometheus --replicas=0 -n observability
kubectl scale deployment/prometheus --replicas=1 -n observability

# Check for stuck finalizers
kubectl get pods -n observability -o json | jq '.items[] | select(.metadata.deletionTimestamp != null)'
```

### Data Loss Detected

**Symptoms:** Metrics/logs/traces missing after recovery

**Investigation:**
```bash
# Check Prometheus WAL
kubectl exec -n observability prometheus-0 -- ls -lh /prometheus/wal/

# Check Loki retention
kubectl exec -n observability loki-0 -- ls -lh /var/loki/chunks/

# Query for gaps
# In Grafana, check for missing data points
```

**Prevention:**
- Ensure adequate PersistentVolume storage
- Configure proper retention policies
- Enable WAL for Prometheus
- Use replication for critical data

## Results Interpretation

### Success Criteria

✅ **PASS** if:
- All pods recover within timeout (<3 min)
- No services remain degraded
- Alerts fire and clear appropriately
- No data loss detected
- Comprehensive workflow completes successfully

⚠️ **WARNING** if:
- Recovery takes longer than expected
- Some alerts don't fire/clear
- Minor data loss (<1% of time period)

❌ **FAIL** if:
- Components don't recover
- Manual intervention required
- Significant data loss (>5%)
- System remains degraded

### Results JSON

```json
{
  "timestamp": "2025-10-22T12:00:00Z",
  "test_type": "comprehensive",
  "namespace": "observability",
  "tests_run": 5,
  "tests_passed": 5,
  "tests_failed": 0,
  "pass_rate": 100.00,
  "details": {
    "prometheus_recovery_time": "45s",
    "loki_recovery_time": "62s",
    "tempo_recovery_time": "118s",
    "otel_recovery_time": "38s"
  }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Chaos Engineering Tests
on:
  schedule:
    - cron: '0 4 * * 0'  # Weekly Sunday 4 AM
  workflow_dispatch:

jobs:
  chaos-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3

      - name: Run Chaos Tests
        run: |
          cd infrastructure/kubernetes/chaos-experiments
          ./run-chaos-test.sh comprehensive

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: chaos-test-results
          path: infrastructure/kubernetes/chaos-experiments/chaos-results/
```

## References

- [Chaos Mesh Documentation](https://chaos-mesh.org/docs/)
- [Principles of Chaos Engineering](https://principlesofchaos.org/)
- [Google SRE Book - Testing for Reliability](https://sre.google/sre-book/testing-reliability/)
- [Netflix Chaos Engineering](https://netflixtechblog.com/tagged/chaos-engineering)

---

**Last Updated:** 2025-10-22
**Maintainer:** DevOps Team
**Status:** Production Ready
**Warning:** Run chaos tests in non-production first!
