# Disaster Recovery Checklist

Quick reference checklist for disaster recovery events. Print this and keep accessible for emergency situations.

## Pre-Incident Preparation

### Backup Verification (Monthly)

- [ ] Verify Prometheus backups exist in S3
  ```bash
  aws s3 ls s3://health-tracker-prometheus-backups/prometheus-snapshots/ | tail -5
  ```

- [ ] Verify Grafana dashboard backups in Git
  ```bash
  git log --oneline .github/dashboards/ | head -5
  ```

- [ ] Verify backup CronJobs are running
  ```bash
  kubectl get cronjobs -n observability
  ```

- [ ] Check backup job success rate
  ```bash
  kubectl get jobs -n observability -l component=backup --field-selector status.successful=1
  ```

### Access Verification (Quarterly)

- [ ] Verify AWS S3 credentials are valid
  ```bash
  aws s3 ls s3://health-tracker-prometheus-backups/
  ```

- [ ] Verify Git repository access
  ```bash
  git ls-remote git@github.com:your-org/health-tracker.git
  ```

- [ ] Verify kubectl access to production cluster
  ```bash
  kubectl get nodes
  ```

- [ ] Test emergency contact list
  - [ ] DevOps Lead: [Phone]
  - [ ] On-Call Engineer: [PagerDuty]
  - [ ] Platform Team: [Slack/Email]

### Documentation Review (Quarterly)

- [ ] Review DISASTER-RECOVERY.md procedures
- [ ] Update emergency contact information
- [ ] Verify all commands in runbook are current
- [ ] Update "Last Tested" timestamp

## Incident Detection

### Symptoms Checklist

**Prometheus Down:**
- [ ] Metrics not updating in Grafana
- [ ] Prometheus pods CrashLooping
- [ ] Prometheus storage full
- [ ] Prometheus API not responding

**Loki Down:**
- [ ] Logs not appearing in Grafana
- [ ] Loki pods CrashLooping
- [ ] Loki storage full
- [ ] Loki API not responding

**Grafana Down:**
- [ ] Dashboards not loading
- [ ] Grafana UI not accessible
- [ ] Grafana pods CrashLooping
- [ ] Grafana database connection failed

**Tempo Down:**
- [ ] Traces not appearing in Grafana
- [ ] Tempo pods CrashLooping
- [ ] Tempo storage full
- [ ] Tempo API not responding

**AlertManager Down:**
- [ ] Alerts not firing
- [ ] AlertManager UI not accessible
- [ ] AlertManager pods CrashLooping
- [ ] Notifications not being sent

## Initial Response (First 5 Minutes)

### 1. Acknowledge Incident

- [ ] Acknowledge alert in PagerDuty/monitoring system
- [ ] Note incident start time: `_______________`
- [ ] Create incident channel in Slack: `#incident-YYYYMMDD-HHmm`

### 2. Assess Scope

- [ ] Check all observability pods status
  ```bash
  kubectl get pods -n observability
  ```

- [ ] Identify failed components:
  - [ ] Prometheus
  - [ ] Loki
  - [ ] Tempo
  - [ ] Grafana
  - [ ] AlertManager
  - [ ] OTel Collector

- [ ] Determine severity:
  - [ ] **SEV1**: Complete observability stack down
  - [ ] **SEV2**: Critical component down (Prometheus/Grafana)
  - [ ] **SEV3**: Non-critical component down

### 3. Notify Team

- [ ] Page on-call engineer
- [ ] Notify DevOps lead
- [ ] Post initial status in incident channel
  ```
  🚨 INCIDENT: [Component] is down
  Started: [Time]
  Severity: [SEV1/2/3]
  Impact: [Description]
  Response: Recovery in progress
  ETA: [Estimate]
  ```

## Recovery Execution (Next 30-60 Minutes)

### Prometheus Recovery

- [ ] Stop Prometheus StatefulSet
  ```bash
  kubectl scale statefulset -n observability prometheus --replicas=0
  ```

- [ ] List available backups
  ```bash
  aws s3 ls s3://health-tracker-prometheus-backups/prometheus-snapshots/ --recursive
  ```

- [ ] Select backup ID: `_______________`

- [ ] Create restore pod
  ```bash
  # See DISASTER-RECOVERY.md Step 6
  ```

- [ ] Download and restore backup
  ```bash
  # See DISASTER-RECOVERY.md Steps 9-10
  ```

- [ ] Start Prometheus
  ```bash
  kubectl scale statefulset -n observability prometheus --replicas=2
  ```

- [ ] Wait for ready
  ```bash
  kubectl wait --for=condition=Ready pod/prometheus-0 -n observability --timeout=300s
  ```

- [ ] Verify health
  ```bash
  kubectl exec -n observability prometheus-0 -- wget -qO- http://localhost:9090/-/healthy
  ```

- [ ] Recovery completion time: `_______________`

### Grafana Dashboard Recovery

- [ ] Clone repository
  ```bash
  git clone git@github.com:your-org/health-tracker.git /tmp/health-tracker
  ```

- [ ] Port-forward to Grafana
  ```bash
  kubectl port-forward -n observability svc/grafana 3000:3000
  ```

- [ ] Get admin password
  ```bash
  kubectl get secret -n observability grafana-admin-credentials \
    -o jsonpath='{.data.admin-password}' | base64 -d
  ```

- [ ] Create API key (Admin role, 1 hour TTL)
  - Via UI: Configuration → API Keys → Add API Key
  - API key: `_______________`

- [ ] Restore dashboards
  ```bash
  # See DISASTER-RECOVERY.md Step 8
  ```

- [ ] Verify dashboards
  ```bash
  curl -s -H "Authorization: Bearer API_KEY" \
    http://localhost:3000/api/search?type=dash-db | jq length
  ```

- [ ] Recovery completion time: `_______________`

### Loki Recovery

- [ ] Stop Loki StatefulSet
  ```bash
  kubectl scale statefulset -n observability loki --replicas=0
  ```

- [ ] Verify S3 data
  ```bash
  aws s3 ls s3://health-tracker-loki-chunks/index/ --recursive | head -20
  ```

- [ ] Clear corrupted local data (if needed)
  ```bash
  # See DISASTER-RECOVERY.md Step 3
  ```

- [ ] Start Loki
  ```bash
  kubectl scale statefulset -n observability loki --replicas=2
  ```

- [ ] Verify health
  ```bash
  kubectl exec -n observability loki-0 -- wget -qO- http://localhost:3100/ready
  ```

- [ ] Recovery completion time: `_______________`

### Tempo Recovery

- [ ] Stop Tempo StatefulSet
  ```bash
  kubectl scale statefulset -n observability tempo --replicas=0
  ```

- [ ] Verify S3 data
  ```bash
  aws s3 ls s3://health-tracker-tempo-traces/ --recursive | head -20
  ```

- [ ] Start Tempo
  ```bash
  kubectl scale statefulset -n observability tempo --replicas=2
  ```

- [ ] Verify health
  ```bash
  kubectl exec -n observability tempo-0 -- wget -qO- http://localhost:3200/ready
  ```

- [ ] Recovery completion time: `_______________`

### AlertManager Recovery

- [ ] Stop AlertManager
  ```bash
  kubectl scale statefulset -n observability alertmanager --replicas=0
  ```

- [ ] Redeploy configuration
  ```bash
  kubectl apply -k infrastructure/kubernetes/alertmanager/base/
  ```

- [ ] Start AlertManager
  ```bash
  kubectl scale statefulset -n observability alertmanager --replicas=2
  ```

- [ ] Verify cluster status
  ```bash
  kubectl exec -n observability alertmanager-0 -- \
    wget -qO- http://localhost:9093/api/v2/status | jq .
  ```

- [ ] Recovery completion time: `_______________`

## Post-Recovery Validation (Next 15 Minutes)

### Health Checks

- [ ] All pods running
  ```bash
  kubectl get pods -n observability
  ```

- [ ] All services accessible
  ```bash
  kubectl get svc -n observability
  ```

- [ ] Prometheus healthy
  ```bash
  kubectl exec -n observability prometheus-0 -- wget -qO- http://localhost:9090/-/healthy
  ```

- [ ] Loki healthy
  ```bash
  kubectl exec -n observability loki-0 -- wget -qO- http://localhost:3100/ready
  ```

- [ ] Tempo healthy
  ```bash
  kubectl exec -n observability tempo-0 -- wget -qO- http://localhost:3200/ready
  ```

- [ ] AlertManager healthy
  ```bash
  kubectl exec -n observability alertmanager-0 -- wget -qO- http://localhost:9093/-/healthy
  ```

- [ ] Grafana healthy
  ```bash
  kubectl exec -n observability $(kubectl get pods -n observability -l app=grafana -o name | head -1) \
    -- wget -qO- http://localhost:3000/api/health
  ```

### Data Flow Validation

- [ ] Metrics flowing
  ```bash
  # Port-forward and check: http://localhost:9090/targets
  ```

- [ ] Logs flowing
  ```bash
  # Port-forward and check: http://localhost:3100/ready
  ```

- [ ] Traces flowing
  ```bash
  # Port-forward and check: http://localhost:3200/api/search
  ```

- [ ] Dashboards displaying data
  ```bash
  # Check: http://localhost:3000/dashboards
  ```

- [ ] Alerts firing correctly
  ```bash
  # Check: http://localhost:9093/#/alerts
  ```

### Performance Validation

- [ ] Query latency acceptable (< 5s)
- [ ] Dashboard load time acceptable (< 10s)
- [ ] No error spikes in logs
- [ ] CPU/Memory usage normal

## Incident Closure (Next 30 Minutes)

### Documentation

- [ ] Record incident details
  - **Incident ID**: `_______________`
  - **Start Time**: `_______________`
  - **End Time**: `_______________`
  - **Duration**: `_______________`
  - **Components Affected**: `_______________`
  - **Root Cause**: `_______________`
  - **RTO Achieved**: `_______________` (Target: < 60 min)
  - **RPO Achieved**: `_______________` (Target: < 24 hrs)

- [ ] Update incident log
  ```bash
  # Save to: incidents/YYYY-MM-DD-incident-report.md
  ```

- [ ] Take screenshots of recovery metrics

- [ ] Export relevant logs
  ```bash
  kubectl logs -n observability [pod] > /tmp/incident-logs.txt
  ```

### Communication

- [ ] Post recovery status in incident channel
  ```
  ✅ RESOLVED: [Component] recovered
  Duration: [Time]
  RTO: [Achieved vs Target]
  Impact: [Summary]
  Next Steps: Post-mortem scheduled
  ```

- [ ] Notify stakeholders
- [ ] Update status page (if applicable)
- [ ] Close PagerDuty incident

### Post-Mortem Scheduling

- [ ] Schedule post-mortem meeting (within 48 hours)
  - **Date**: `_______________`
  - **Time**: `_______________`
  - **Attendees**: DevOps team, On-call, Affected stakeholders

- [ ] Prepare post-mortem document
  - Timeline of events
  - Root cause analysis
  - What went well
  - What could be improved
  - Action items

## Action Items

### Immediate (Next 24 Hours)

- [ ] Review and update DR procedures if gaps found
- [ ] Document lessons learned
- [ ] Update monitoring/alerting if detection was delayed
- [ ] File tickets for any bugs discovered

### Short-Term (Next Week)

- [ ] Implement action items from post-mortem
- [ ] Update runbooks based on actual recovery experience
- [ ] Enhance monitoring/alerting
- [ ] Schedule follow-up DR test

### Long-Term (Next Month)

- [ ] Review and update backup procedures
- [ ] Improve automation where manual steps were needed
- [ ] Update team training materials
- [ ] Schedule next DR drill

## Emergency Escalation

If recovery is not progressing or RTO is at risk:

1. **Escalate to DevOps Lead**: [Phone]
2. **Engage Platform Team**: [Slack/Email]
3. **Consider external support**: Cloud provider support
4. **Update stakeholders** on extended ETA
5. **Activate backup plan**: Deploy to secondary region (if available)

## Notes

Use this space to record incident-specific notes:

```
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________
```

## Checklist Completion

- [ ] All recovery steps completed
- [ ] All validation checks passed
- [ ] All documentation updated
- [ ] All stakeholders notified
- [ ] Post-mortem scheduled
- [ ] This checklist archived for reference

**Completed By**: `_______________`
**Date**: `_______________`
**Signature**: `_______________`
