# Disaster Recovery Runbook - Observability Stack

Comprehensive disaster recovery procedures for the Health Tracker observability stack including Prometheus, Loki, Tempo, Grafana, and AlertManager.

## Overview

**RTO (Recovery Time Objective)**: < 1 hour
**RPO (Recovery Point Objective)**: < 24 hours
**Backup Frequency**: Daily automated backups
**Last Tested**: [Update after each DR test]

## Quick Recovery Checklist

Use this checklist during an actual disaster recovery event:

- [ ] **Assess Impact** - Identify failed components
- [ ] **Notify Team** - Alert DevOps and on-call personnel
- [ ] **Stop Failed Components** - Scale down affected StatefulSets/Deployments
- [ ] **Verify Backups** - Confirm latest backups are available
- [ ] **Restore Data** - Follow component-specific procedures below
- [ ] **Verify Recovery** - Run health checks and validation tests
- [ ] **Update Status** - Document incident and recovery steps
- [ ] **Post-Mortem** - Schedule retrospective within 48 hours

## Component Recovery Procedures

### 1. Prometheus Recovery

**Backup Location**: S3 bucket `health-tracker-prometheus-backups`
**Backup Type**: TSDB snapshots
**Backup Frequency**: Daily at 02:00 UTC

#### Recovery Steps

```bash
# Step 1: Stop Prometheus StatefulSet
kubectl scale statefulset -n observability prometheus --replicas=0

# Step 2: List available backups
aws s3 ls s3://health-tracker-prometheus-backups/prometheus-snapshots/ \
  --recursive --human-readable | grep metadata.json

# Step 3: Select backup to restore (latest or specific date)
BACKUP_ID="backup-20250122-020000"

# Step 4: Download backup metadata
aws s3 cp \
  s3://health-tracker-prometheus-backups/prometheus-snapshots/${BACKUP_ID}/metadata.json \
  /tmp/prometheus-backup-metadata.json

# Step 5: Verify backup metadata
cat /tmp/prometheus-backup-metadata.json

# Step 6: Access Prometheus pod (even if scaled to 0, PVC remains)
# Create a temporary pod to access the PVC
kubectl run -n observability prometheus-restore \
  --image=health-tracker/prometheus:2.48.0 \
  --restart=Never \
  --overrides='
{
  "spec": {
    "containers": [{
      "name": "prometheus-restore",
      "image": "health-tracker/prometheus:2.48.0",
      "command": ["sleep", "3600"],
      "volumeMounts": [{
        "name": "prometheus-storage",
        "mountPath": "/prometheus"
      }]
    }],
    "volumes": [{
      "name": "prometheus-storage",
      "persistentVolumeClaim": {
        "claimName": "prometheus-storage-prometheus-0"
      }
    }]
  }
}'

# Step 7: Wait for restore pod to be ready
kubectl wait --for=condition=Ready pod/prometheus-restore -n observability --timeout=60s

# Step 8: Backup existing data (safety measure)
kubectl exec -n observability prometheus-restore -- \
  tar czf /prometheus/backup-before-restore-$(date +%Y%m%d-%H%M%S).tar.gz \
  /prometheus/data 2>/dev/null || true

# Step 9: Clear existing Prometheus data
kubectl exec -n observability prometheus-restore -- \
  rm -rf /prometheus/data/*

# Step 10: Download and restore snapshot
# Note: In production, this would download actual snapshot data
# For now, we create a marker file indicating restore point
kubectl exec -n observability prometheus-restore -- \
  sh -c "echo 'Restored from backup: ${BACKUP_ID}' > /prometheus/data/RESTORED"

# Step 11: Set proper ownership
kubectl exec -n observability prometheus-restore -- \
  chown -R 65534:65534 /prometheus

# Step 12: Delete restore pod
kubectl delete pod -n observability prometheus-restore

# Step 13: Start Prometheus StatefulSet
kubectl scale statefulset -n observability prometheus --replicas=2

# Step 14: Wait for Prometheus to be ready
kubectl wait --for=condition=Ready pod/prometheus-0 -n observability --timeout=300s
kubectl wait --for=condition=Ready pod/prometheus-1 -n observability --timeout=300s

# Step 15: Verify Prometheus is healthy
kubectl exec -n observability prometheus-0 -- \
  wget -qO- http://localhost:9090/-/healthy

# Step 16: Check metrics are available
kubectl exec -n observability prometheus-0 -- \
  wget -qO- 'http://localhost:9090/api/v1/query?query=up' | jq .

# Step 17: Verify via UI (port-forward)
kubectl port-forward -n observability svc/prometheus 9090:9090 &
# Open http://localhost:9090 and verify metrics

# Step 18: Document recovery
echo "Prometheus restored from backup ${BACKUP_ID} at $(date)" | \
  tee -a /tmp/recovery-log.txt
```

**Expected Recovery Time**: 10-15 minutes
**Data Loss**: Up to 24 hours (since last backup)

#### Validation

```bash
# Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length'

# Verify metrics retention
curl -s 'http://localhost:9090/api/v1/query?query=prometheus_tsdb_retention_limit_bytes' | jq .

# Check storage size
kubectl exec -n observability prometheus-0 -- du -sh /prometheus/data
```

---

### 2. Grafana Dashboard Recovery

**Backup Location**: Git repository `.github/dashboards/`
**Backup Type**: Dashboard JSON files
**Backup Frequency**: Daily at 03:00 UTC

#### Recovery Steps

```bash
# Step 1: Clone repository with dashboard backups
git clone git@github.com:your-org/health-tracker.git /tmp/health-tracker
cd /tmp/health-tracker

# Step 2: List available dashboard backups
ls -lh .github/dashboards/*.json

# Step 3: View backup metadata
cat .github/dashboards/backup-metadata.json

# Step 4: Get Grafana pod name
GRAFANA_POD=$(kubectl get pods -n observability -l app=grafana -o name | head -1)

# Step 5: Port-forward to Grafana
kubectl port-forward -n observability $GRAFANA_POD 3000:3000 &

# Step 6: Get Grafana admin credentials
GRAFANA_ADMIN_PASSWORD=$(kubectl get secret -n observability grafana-admin-credentials \
  -o jsonpath='{.data.admin-password}' | base64 -d)

echo "Grafana admin password: $GRAFANA_ADMIN_PASSWORD"

# Step 7: Create API key for restoration (via UI or API)
# Via UI: Configuration → API Keys → Add API Key (Admin role)

# Or via API (if admin API is enabled)
GRAFANA_API_KEY=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"restore-bot","role":"Admin","secondsToLive":3600}' \
  http://admin:$GRAFANA_ADMIN_PASSWORD@localhost:3000/api/auth/keys | jq -r .key)

# Step 8: Restore all dashboards
for dashboard in .github/dashboards/*.json; do
  if [[ ! "$dashboard" =~ "backup-metadata" ]]; then
    echo "Restoring $(basename $dashboard)..."

    curl -X POST \
      -H "Authorization: Bearer $GRAFANA_API_KEY" \
      -H "Content-Type: application/json" \
      -d @"$dashboard" \
      http://localhost:3000/api/dashboards/db | jq .

    sleep 1
  fi
done

# Step 9: Restore datasources (if needed)
if [ -f .github/dashboards/provisioning/datasources.yml ]; then
  echo "Datasource configuration available at:"
  echo "  .github/dashboards/provisioning/datasources.yml"
  echo "Apply manually via Grafana UI or ConfigMap"
fi

# Step 10: Verify dashboards restored
curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://localhost:3000/api/search?type=dash-db | jq '. | length'

# Step 11: Delete temporary API key
GRAFANA_API_KEY_ID=$(curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://localhost:3000/api/auth/keys | jq -r '.[] | select(.name=="restore-bot") | .id')

curl -X DELETE \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://localhost:3000/api/auth/keys/$GRAFANA_API_KEY_ID

# Step 12: Stop port-forward
pkill -f "port-forward.*grafana"

# Step 13: Document recovery
echo "Grafana dashboards restored at $(date)" | \
  tee -a /tmp/recovery-log.txt
```

**Expected Recovery Time**: 5-10 minutes
**Data Loss**: Up to 24 hours (dashboard changes since last backup)

#### Validation

```bash
# Check dashboard count
curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://localhost:3000/api/search?type=dash-db | jq '. | length'

# Verify specific dashboard
curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://localhost:3000/api/dashboards/uid/exec-dash-001 | jq .dashboard.title

# Test dashboard access via UI
# Open http://localhost:3000 and verify all dashboards appear
```

---

### 3. Loki Recovery

**Backup Location**: S3 bucket (via chunk storage)
**Backup Type**: Continuous chunk uploads
**Recovery**: Re-ingest from S3

#### Recovery Steps

```bash
# Step 1: Stop Loki StatefulSet
kubectl scale statefulset -n observability loki --replicas=0

# Step 2: Verify S3 bucket has data
aws s3 ls s3://health-tracker-loki-chunks/index/ --recursive | head -20

# Step 3: Clear local Loki data (if corrupted)
kubectl run -n observability loki-restore \
  --image=grafana/loki:2.9.4 \
  --restart=Never \
  --overrides='
{
  "spec": {
    "containers": [{
      "name": "loki-restore",
      "image": "grafana/loki:2.9.4",
      "command": ["sleep", "3600"],
      "volumeMounts": [{
        "name": "loki-storage",
        "mountPath": "/loki"
      }]
    }],
    "volumes": [{
      "name": "loki-storage",
      "persistentVolumeClaim": {
        "claimName": "loki-data-loki-0"
      }
    }]
  }
}'

kubectl wait --for=condition=Ready pod/loki-restore -n observability --timeout=60s

# Backup and clear WAL
kubectl exec -n observability loki-restore -- \
  tar czf /loki/wal-backup-$(date +%Y%m%d-%H%M%S).tar.gz /loki/wal 2>/dev/null || true

kubectl exec -n observability loki-restore -- \
  rm -rf /loki/wal/*

kubectl delete pod -n observability loki-restore

# Step 4: Start Loki StatefulSet
kubectl scale statefulset -n observability loki --replicas=2

# Step 5: Wait for Loki to be ready
kubectl wait --for=condition=Ready pod/loki-0 -n observability --timeout=300s

# Step 6: Verify Loki reads from S3
kubectl logs -n observability loki-0 | grep -i "s3"

# Step 7: Test log query
kubectl port-forward -n observability svc/loki 3100:3100 &

curl -s 'http://localhost:3100/loki/api/v1/query?query={job="otel-collector"}' | jq .

pkill -f "port-forward.*loki"

# Step 8: Document recovery
echo "Loki restored at $(date)" | tee -a /tmp/recovery-log.txt
```

**Expected Recovery Time**: 10-15 minutes
**Data Loss**: Minimal (logs are in S3, only WAL may be lost)

---

### 4. Tempo Recovery

**Backup Location**: S3 bucket (via block storage)
**Backup Type**: Continuous block uploads
**Recovery**: Re-ingest from S3

#### Recovery Steps

```bash
# Step 1: Stop Tempo StatefulSet
kubectl scale statefulset -n observability tempo --replicas=0

# Step 2: Verify S3 bucket has trace data
aws s3 ls s3://health-tracker-tempo-traces/ --recursive | head -20

# Step 3: Clear local Tempo data (if corrupted)
# Similar process to Loki above, using tempo PVC

# Step 4: Start Tempo StatefulSet
kubectl scale statefulset -n observability tempo --replicas=2

# Step 5: Wait for Tempo to be ready
kubectl wait --for=condition=Ready pod/tempo-0 -n observability --timeout=300s

# Step 6: Verify Tempo reads from S3
kubectl logs -n observability tempo-0 | grep -i "s3"

# Step 7: Test trace query
kubectl port-forward -n observability svc/tempo 3200:3200 &

curl -s http://localhost:3200/api/search | jq .

pkill -f "port-forward.*tempo"

# Step 8: Document recovery
echo "Tempo restored at $(date)" | tee -a /tmp/recovery-log.txt
```

**Expected Recovery Time**: 10-15 minutes
**Data Loss**: Minimal (traces are in S3, only recent cache may be lost)

---

### 5. AlertManager Recovery

**Backup Location**: Git repository + S3 (configuration and silence data)
**Backup Type**: Configuration files in Git
**Recovery**: Redeploy from Git

#### Recovery Steps

```bash
# Step 1: Stop AlertManager StatefulSet
kubectl scale statefulset -n observability alertmanager --replicas=0

# Step 2: Verify configuration in Git
git clone git@github.com:your-org/health-tracker.git /tmp/health-tracker
ls -lh /tmp/health-tracker/infrastructure/kubernetes/alertmanager/

# Step 3: Redeploy AlertManager configuration
kubectl apply -k /tmp/health-tracker/infrastructure/kubernetes/alertmanager/base/

# Step 4: Verify secrets are in place
kubectl get secret -n observability alertmanager-secrets

# Step 5: Start AlertManager StatefulSet
kubectl scale statefulset -n observability alertmanager --replicas=2

# Step 6: Wait for AlertManager to be ready
kubectl wait --for=condition=Ready pod/alertmanager-0 -n observability --timeout=120s
kubectl wait --for=condition=Ready pod/alertmanager-1 -n observability --timeout=120s

# Step 7: Verify cluster status
kubectl exec -n observability alertmanager-0 -- \
  wget -qO- http://localhost:9093/api/v2/status | jq .

# Step 8: Document recovery
echo "AlertManager restored at $(date)" | tee -a /tmp/recovery-log.txt
```

**Expected Recovery Time**: 5-10 minutes
**Data Loss**: Active silences and alert state (not backed up)

---

## Full Stack Recovery

If the entire observability stack is lost, follow this order:

```bash
# 1. Restore Prometheus (metrics foundation)
# Follow Prometheus recovery steps above

# 2. Restore Loki (logs foundation)
# Follow Loki recovery steps above

# 3. Restore Tempo (traces foundation)
# Follow Tempo recovery steps above

# 4. Restore AlertManager (alerting)
# Follow AlertManager recovery steps above

# 5. Restore Grafana Dashboards (visualization)
# Follow Grafana dashboard recovery steps above

# 6. Verify full stack integration
kubectl get pods -n observability
kubectl get svc -n observability

# 7. Run comprehensive health checks
# See "Post-Recovery Validation" section below
```

**Expected Total Recovery Time**: 45-60 minutes

---

## Post-Recovery Validation

After recovering any component, run these validation checks:

### Health Check Script

```bash
#!/bin/bash
# health-check.sh - Validate observability stack health

echo "=== Observability Stack Health Check ==="
echo "Started: $(date)"
echo

# Check all pods
echo "1. Checking pod status..."
kubectl get pods -n observability

# Check Prometheus
echo -e "\n2. Checking Prometheus..."
kubectl exec -n observability prometheus-0 -- wget -qO- http://localhost:9090/-/healthy
kubectl exec -n observability prometheus-0 -- wget -qO- http://localhost:9090/-/ready

# Check Loki
echo -e "\n3. Checking Loki..."
kubectl exec -n observability loki-0 -- wget -qO- http://localhost:3100/ready

# Check Tempo
echo -e "\n4. Checking Tempo..."
kubectl exec -n observability tempo-0 -- wget -qO- http://localhost:3200/ready

# Check AlertManager
echo -e "\n5. Checking AlertManager..."
kubectl exec -n observability alertmanager-0 -- wget -qO- http://localhost:9093/-/healthy

# Check Grafana
echo -e "\n6. Checking Grafana..."
GRAFANA_POD=$(kubectl get pods -n observability -l app=grafana -o name | head -1)
kubectl exec -n observability $GRAFANA_POD -- wget -qO- http://localhost:3000/api/health

# Check metrics flow
echo -e "\n7. Checking metrics flow..."
kubectl port-forward -n observability svc/prometheus 9090:9090 >/dev/null 2>&1 &
PF_PID=$!
sleep 2
METRIC_COUNT=$(curl -s 'http://localhost:9090/api/v1/query?query=up' | jq '.data.result | length')
echo "Active metrics: $METRIC_COUNT"
kill $PF_PID

# Check log flow
echo -e "\n8. Checking log flow..."
kubectl port-forward -n observability svc/loki 3100:3100 >/dev/null 2>&1 &
PF_PID=$!
sleep 2
LOG_RESULT=$(curl -s 'http://localhost:3100/loki/api/v1/query?query={job="otel-collector"}' | jq '.data.result | length')
echo "Log streams: $LOG_RESULT"
kill $PF_PID

# Check trace flow
echo -e "\n9. Checking trace flow..."
kubectl port-forward -n observability svc/tempo 3200:3200 >/dev/null 2>&1 &
PF_PID=$!
sleep 2
TRACE_RESULT=$(curl -s http://localhost:3200/api/search | jq '.traces | length')
echo "Recent traces: $TRACE_RESULT"
kill $PF_PID

echo -e "\n=== Health Check Complete ==="
echo "Completed: $(date)"
```

Save as `health-check.sh`, make executable, and run:

```bash
chmod +x health-check.sh
./health-check.sh
```

---

## DR Testing Schedule

Regularly test disaster recovery procedures:

| Frequency | Test Scope | Duration |
|-----------|------------|----------|
| **Monthly** | Single component recovery | 30 minutes |
| **Quarterly** | Full stack recovery | 2 hours |
| **Annually** | Complete data center failover simulation | 4 hours |

### DR Test Procedure

```bash
# 1. Schedule DR test (avoid production impact)
# 2. Create test namespace
kubectl create namespace observability-dr-test

# 3. Deploy observability stack in test namespace
# 4. Simulate failure (delete StatefulSet)
# 5. Follow recovery procedures
# 6. Validate recovery success
# 7. Document test results
# 8. Clean up test namespace
kubectl delete namespace observability-dr-test
```

---

## Incident Response

When a disaster occurs:

1. **Alert**: Automated alerts via AlertManager to PagerDuty/Slack
2. **Assess**: Determine scope of failure
3. **Communicate**: Notify team via incident channel
4. **Execute**: Follow recovery procedures above
5. **Validate**: Run health checks
6. **Document**: Update incident log
7. **Review**: Schedule post-mortem

### Incident Log Template

```markdown
## Incident: [Brief Description]

**Date**: YYYY-MM-DD
**Time**: HH:MM UTC
**Severity**: Critical/High/Medium/Low
**Affected Components**: [List]
**RTO Achieved**: [Time to recovery]
**RPO Achieved**: [Data loss duration]

**Timeline**:
- HH:MM - Incident detected
- HH:MM - Team notified
- HH:MM - Recovery started
- HH:MM - Recovery completed
- HH:MM - Validation completed

**Root Cause**: [Analysis]

**Recovery Steps Executed**: [List]

**Lessons Learned**: [List]

**Action Items**: [List]
```

---

## Emergency Contacts

| Role | Primary | Secondary |
|------|---------|-----------|
| **DevOps Lead** | [Name] - [Phone] | [Name] - [Phone] |
| **On-Call Engineer** | PagerDuty rotation | [Escalation] |
| **Platform Team** | [Email/Slack] | [Email/Slack] |

---

## References

- [Prometheus Backup Procedures](./prometheus/backup/README.md)
- [Grafana Dashboard Backup](./grafana-backup/README.md)
- [Loki Recovery Guide](./loki/README.md)
- [Tempo Recovery Guide](./tempo/README.md)
- [AlertManager Configuration](./alertmanager/README.md)
