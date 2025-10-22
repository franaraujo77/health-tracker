# Operational Runbooks

## How to Use This Document

Each runbook follows this structure:
1. **Symptoms**: How to recognize the issue
2. **Investigation Steps**: What to check
3. **Common Causes**: Why it happens
4. **Remediation**: How to fix it
5. **Escalation**: When to involve others

**Quick Links**:
- [Runbook 1: High Pipeline Error Rate](#runbook-1-high-pipeline-error-rate)
- [Runbook 2: Cost Spike Detected](#runbook-2-cost-spike-detected)
- [Runbook 3: Pipeline Timeout](#runbook-3-pipeline-timeout)
- [Runbook 4: Slow Query Performance](#runbook-4-slow-query-performance)
- [Runbook 5: Data Retention Issues](#runbook-5-data-retention-issues)
- [Runbook 6: Component Health Degradation](#runbook-6-component-health-degradation)
- [Runbook 7: Alert Storm](#runbook-7-alert-storm)
- [Runbook 8: Metrics Not Appearing](#runbook-8-metrics-not-appearing)
- [Runbook 9: Disk Space Critical](#runbook-9-disk-space-critical)
- [Runbook 10: Automated Recovery Failing](#runbook-10-automated-recovery-failing)

---

## Runbook 1: High Pipeline Error Rate

**Alert**: `PipelineErrorRate > 10% for 10 minutes`

### Symptoms
- Alert fired in #pipeline-alerts
- Operations Dashboard shows red indicators
- Multiple workflow failures visible
- Success rate dropped below 90%

### Investigation Steps

1. **Check Operations Dashboard** (`/d/operations-overview`)
   - Look at "Error Rate by Stage" panel
   - Identify which stage is failing (checkout, build, test, deploy)
   - Note affected workflows

2. **Review Recent Changes**
   ```bash
   # Check recent commits
   git log --since="2 hours ago" --oneline

   # Check recent deployments
   kubectl get deployments -n ci-cd -o wide
   ```

3. **Check Logs in Loki**
   ```logql
   {workflow="frontend-ci"} |= "error" | json | level="error"
   ```

4. **Verify External Dependencies**
   - GitHub API status: https://www.githubstatus.com/
   - Docker Hub status: https://status.docker.com/
   - npm registry: https://status.npmjs.org/

### Common Causes

**Cause 1: GitHub API Rate Limit**
- Symptoms: Checkout stage failures, 403 errors
- Solution: Wait for rate limit reset or use PAT with higher limits
- Prevention: Implement token rotation

**Cause 2: Dependency Download Failures**
- Symptoms: Build stage failures, connection timeouts
- Solution: Retry workflow, check registry status
- Prevention: Use dependency caching, mirror registries

**Cause 3: Flaky Tests**
- Symptoms: Test stage intermittent failures
- Solution: Identify flaky tests in Development Dashboard
- Prevention: Fix or skip flaky tests, add retries

**Cause 4: Infrastructure Issues**
- Symptoms: Random failures across all workflows
- Solution: Check K8s cluster health, node status
- Prevention: Ensure adequate cluster resources

### Remediation

**Immediate (0-5 minutes)**:
```bash
# Check if automated recovery is working
kubectl logs -n default deployment/backend | grep "recovery"

# Manual workflow retry
gh workflow run <workflow-name> --ref main
```

**Short-term (5-30 minutes)**:
```bash
# If dependency issue, clear cache
gh cache delete --all

# If resource issue, scale up
kubectl scale deployment/runner-pool --replicas=5
```

**Long-term (30+ minutes)**:
- Fix root cause in code
- Update dependencies
- Improve test stability
- Add monitoring for early detection

### Escalation

- **Unresolved after 30 min**: Page DevOps on-call
- **Impacting production deploys**: Page SRE lead immediately
- **External service outage**: Create incident in StatusPage

**On-call rotation**: PagerDuty schedule
**Slack**: #incidents

---

## Runbook 2: Cost Spike Detected

**Alert**: `DailyCostAnomaly > 150% baseline`

### Symptoms
- Alert in #cost-alerts
- Cost Dashboard shows red spike
- Monthly projection exceeded
- Anomaly table has new entries

### Investigation Steps

1. **Go to Cost Dashboard** (`/d/cost-overview`)
   - Check "Cost Anomalies" table
   - Note which service spiked (Claude API, AWS, GitHub)
   - Identify time range of spike

2. **Analyze Service-Specific Costs**

   **For Claude API spikes**:
   ```promql
   # Top consumers
   topk(10, sum(increase(claude_api_cost_dollars[1h])) by (workflow))

   # Token usage per request
   sum(claude_api_tokens_total) / sum(claude_api_requests_total)
   ```

   **For AWS spikes**:
   ```bash
   # Check Cost Explorer
   aws ce get-cost-and-usage --time-period Start=2025-10-21,End=2025-10-22 \
     --granularity DAILY --metrics BlendedCost --group-by Type=SERVICE
   ```

3. **Correlate with Workflow Activity**
   - Check if new workflows deployed
   - Verify if loop/retry logic triggered
   - Review workflow run frequency

### Common Causes

**Cause 1: Runaway Loop**
- Symptoms: Same workflow running 100s of times
- Example: Auto-retry without backoff
- Solution: Kill workflow, fix retry logic

**Cause 2: Model Upgrade**
- Symptoms: Claude API costs doubled overnight
- Example: Switched from claude-3-haiku to claude-3-opus
- Solution: Review model selection, downgrade if appropriate

**Cause 3: Test Data Generation**
- Symptoms: AWS storage costs spiked
- Example: Test suite creating large files
- Solution: Clean up test artifacts, use smaller datasets

**Cause 4: Forgotten Resources**
- Symptoms: Steady increase in AWS costs
- Example: Old EC2 instances still running
- Solution: Audit and terminate unused resources

### Remediation

**Immediate (0-5 minutes)**:
```bash
# Stop expensive workflows
gh workflow disable <workflow-name>

# Check running instances
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running"
```

**Short-term (5-30 minutes)**:
```bash
# Clean up resources
aws s3 rm s3://bucket-name/test-data --recursive

# Set spending alerts
aws budgets create-budget --budget '{
  "BudgetLimit": {"Amount": "100", "Unit": "USD"},
  "BudgetName": "Monthly-Pipeline-Budget",
  "BudgetType": "COST"
}'
```

**Long-term (30+ minutes)**:
- Implement cost controls in code
- Add budget guardrails
- Optimize API usage
- Enable auto-termination for test resources

### Escalation

- **Costs >$500 in 1 hour**: Escalate to Finance immediately
- **Unclear cause**: Involve Security team (possible compromise)
- **Budget exceeded**: Notify Engineering Manager

---

## Runbook 3: Pipeline Timeout

**Alert**: `WorkflowDuration > 30 minutes`

### Symptoms
- Workflow stuck in "running" state
- No progress for >15 minutes
- GitHub Actions UI shows "In progress"
- Logs stopped updating

### Investigation Steps

1. **Check Workflow Status**
   ```bash
   # Get workflow run details
   gh run view <run-id>

   # Check if still making progress
   gh run view <run-id> --log | tail -n 50
   ```

2. **Review Development Dashboard**
   - Go to trace viewer with run ID
   - Identify which span is taking longest
   - Check for hanging operations

3. **Check Resource Availability**
   ```bash
   # Runner status
   kubectl get pods -n github-runners

   # Node resources
   kubectl top nodes
   ```

### Common Causes

**Cause 1: Infinite Loop in Tests**
- Symptoms: Test stage stuck forever
- Solution: Cancel workflow, fix test code
- Prevention: Add test timeouts

**Cause 2: Resource Starvation**
- Symptoms: Stuck at "Waiting for runner"
- Solution: Scale up runner pool
- Prevention: Increase min replicas

**Cause 3: Network Timeouts**
- Symptoms: Hanging during dependency download
- Solution: Cancel and retry with different registry
- Prevention: Configure timeouts, use mirrors

**Cause 4: Lock Contention**
- Symptoms: Multiple workflows waiting on same resource
- Solution: Cancel older workflows, increase concurrency limit
- Prevention: Better concurrency management

### Remediation

**Immediate (0-5 minutes)**:
```bash
# Cancel stuck workflow
gh run cancel <run-id>

# Force kill runner pod if needed
kubectl delete pod <runner-pod> --force --grace-period=0
```

**Short-term (5-30 minutes)**:
```bash
# Scale up runners
kubectl scale deployment/github-runner --replicas=10

# Clear any locks
redis-cli DEL workflow:lock:<workflow-name>
```

**Long-term (30+ minutes)**:
- Add global timeout to workflows (30 min)
- Add per-step timeouts (5-10 min)
- Implement circuit breakers
- Monitor slow operations

### Escalation

- **Multiple workflows affected**: Page DevOps on-call
- **System-wide issue**: Create incident, notify team

---

## Runbook 4: Slow Query Performance

**Alert**: `PrometheusQueryLatency > 5 seconds`

### Symptoms
- Grafana dashboards loading slowly
- "Query timeout" errors
- Browser becomes unresponsive
- Operations Dashboard taking >10s to load

### Investigation Steps

1. **Check Prometheus Health**
   ```bash
   # TSDB status
   curl http://prometheus:9090/api/v1/status/tsdb

   # Query stats
   curl http://prometheus:9090/api/v1/status/runtimeinfo
   ```

2. **Identify Slow Queries**
   - Go to Prometheus UI: `/graph`
   - Check "Status" → "Configuration" → slowest queries
   - Note query patterns

3. **Review Resource Usage**
   ```bash
   kubectl top pod prometheus-0 -n observability
   ```

### Common Causes

**Cause 1: High Cardinality Labels**
- Symptoms: Queries with many unique label values
- Example: `{pod=".*"}` matching 10k pods
- Solution: Add more specific filters

**Cause 2: Large Time Range**
- Symptoms: Querying 90 days of data
- Solution: Reduce time range to 7 days
- Prevention: Use recording rules

**Cause 3: Missing Recording Rules**
- Symptoms: Complex aggregations on every query
- Solution: Pre-compute with recording rules
- Prevention: Identify common queries

**Cause 4: Too Many Active Series**
- Symptoms: >10M active series
- Solution: Reduce cardinality, drop unused metrics
- Prevention: Enforce label limits

### Remediation

**Immediate (0-5 minutes)**:
```bash
# Kill expensive queries
curl -X DELETE http://prometheus:9090/api/v1/admin/tsdb/delete_series?match[]=<high_cardinality_metric>

# Reload Prometheus
curl -X POST http://prometheus:9090/-/reload
```

**Short-term (5-30 minutes)**:
```yaml
# Add recording rule
groups:
  - name: optimizations
    rules:
      - record: workflow:duration:p95_precomputed
        expr: histogram_quantile(0.95, sum(rate(workflow_duration_seconds_bucket[5m])) by (le, workflow))
```

**Long-term (30+ minutes)**:
- Implement metric relabeling to drop high-cardinality labels
- Add cardinality limits in OTel Collector
- Create recording rules for all dashboard queries
- Consider Prometheus sharding for scale

### Escalation

- **Prometheus out of memory**: Restart pod, increase memory limit
- **Repeated issues**: Engage performance team for optimization

---

## Runbook 5: Data Retention Issues

**Alert**: `StorageUsage > 90%` or `OldDataNotDeleted`

### Symptoms
- Prometheus disk usage >90%
- Loki showing "out of space" errors
- Compaction not running
- Query failures due to storage

### Investigation Steps

1. **Check Storage Usage**
   ```bash
   # Prometheus
   kubectl exec -it prometheus-0 -- df -h /prometheus

   # Loki
   kubectl exec -it loki-0 -- df -h /loki

   # S3 bucket size
   aws s3 ls s3://loki-logs --recursive --human-readable --summarize
   ```

2. **Verify Retention Settings**
   ```bash
   # Prometheus config
   kubectl get configmap prometheus-config -o yaml | grep retention

   # Loki config
   kubectl get configmap loki-config -o yaml | grep retention_period
   ```

3. **Check Compaction Status**
   ```bash
   # Prometheus compaction
   curl http://prometheus:9090/api/v1/status/tsdb

   # Loki compactor logs
   kubectl logs -n observability loki-compactor-0
   ```

### Common Causes

**Cause 1: Compaction Disabled**
- Symptoms: Old data not being cleaned up
- Solution: Enable compaction job
- Prevention: Monitor compaction regularly

**Cause 2: Retention Too Long**
- Symptoms: More data than disk capacity
- Solution: Reduce retention period
- Prevention: Calculate storage requirements

**Cause 3: High Ingest Rate**
- Symptoms: Data growing faster than expected
- Solution: Reduce sampling, drop unnecessary metrics
- Prevention: Implement rate limiting

**Cause 4: S3 Upload Failing**
- Symptoms: Local storage full, S3 empty
- Solution: Fix S3 credentials, restart upload
- Prevention: Monitor S3 upload success rate

### Remediation

**Immediate (0-5 minutes)**:
```bash
# Emergency: Reduce retention temporarily
kubectl edit configmap prometheus-config
# Change: retention.time: 30d (from 90d)

kubectl rollout restart statefulset/prometheus
```

**Short-term (5-30 minutes)**:
```bash
# Delete old data manually
curl -X POST http://prometheus:9090/api/v1/admin/tsdb/delete_series \
  --data 'match[]={__name__=~".+"}' \
  --data 'start=2024-01-01T00:00:00Z' \
  --data 'end=2024-06-01T00:00:00Z'

# Clean tombstones
curl -X POST http://prometheus:9090/api/v1/admin/tsdb/clean_tombstones
```

**Long-term (30+ minutes)**:
- Add volume expansion (increase PVC size)
- Implement automatic S3 upload
- Set up storage monitoring and alerts
- Review and optimize metric cardinality

### Escalation

- **Disk at 95%**: Emergency, page on-call immediately
- **S3 upload broken**: Involve Cloud team

---

## Runbook 6: Component Health Degradation

**Alert**: `ComponentHealthScore < 80`

### Symptoms
- Component showing as unhealthy in dashboard
- Health check endpoint returning errors
- Increased restart count
- Performance degradation

### Investigation Steps

1. **Check Component Status**
   ```bash
   # Pod status
   kubectl get pods -n observability

   # Recent events
   kubectl get events -n observability --sort-by='.lastTimestamp'

   # Logs
   kubectl logs -n observability <pod-name> --tail=100
   ```

2. **Review Health Endpoints**
   ```bash
   # OTel Collector
   curl http://otel-collector:13133

   # Prometheus
   curl http://prometheus:9090/-/healthy

   # Loki
   curl http://loki:3100/ready

   # Tempo
   curl http://tempo:3200/ready
   ```

3. **Check Resource Usage**
   ```bash
   kubectl top pod -n observability
   ```

### Common Causes & Remediation

**OTel Collector Issues**:
- **High memory**: Reduce batch size, increase memory limit
- **Queue full**: Scale up replicas, increase processing capacity
- **Exporter failing**: Check backend connectivity

**Prometheus Issues**:
- **WAL corruption**: Restore from backup
- **High CPU**: Optimize queries, add recording rules
- **Scrape failures**: Check target health

**Loki Issues**:
- **S3 connection**: Verify credentials, network
- **Ingestion lag**: Scale up ingesters
- **Query timeout**: Add query limits

**Tempo Issues**:
- **Distributor overload**: Scale up distributors
- **Ingester OOM**: Increase memory limits
- **Compactor stuck**: Check S3 permissions

### Escalation

- **Multiple components unhealthy**: System-wide incident
- **Data loss risk**: Escalate to SRE immediately

---

## Runbook 7: Alert Storm

**Alert**: Multiple alerts firing simultaneously

### Symptoms
- Slack/email flooded with alerts (>20 in 5 min)
- PagerDuty multiple incidents
- AlertManager UI showing 50+ alerts
- Alert fatigue setting in

### Investigation Steps

1. **Access AlertManager UI**
   - Go to http://alertmanager:9093
   - Check "Alerts" page
   - Group by severity and alertname

2. **Identify Root Cause Alert**
   - Look for earliest firing alert
   - Check if other alerts are consequences
   - Review inhibition rules

3. **Check for Cascading Failures**
   ```bash
   # Check if infrastructure issue
   kubectl get nodes
   kubectl get pods --all-namespaces | grep -v Running
   ```

### Common Causes

**Cause 1: Infrastructure Outage**
- Symptoms: Node down, many pods failing
- Solution: Fix node issue, alerts will auto-resolve
- Prevention: Improve inhibition rules

**Cause 2: Broken Alert Rules**
- Symptoms: New alert firing for everything
- Solution: Disable faulty alert rule
- Prevention: Test alerts in staging first

**Cause 3: Legitimate Crisis**
- Symptoms: Multiple real issues happening simultaneously
- Solution: Triage by severity, address critical first
- Prevention: Improve system resilience

**Cause 4: Alert Misconfiguration**
- Symptoms: Duplicate alerts, wrong severity
- Solution: Fix alert definitions
- Prevention: Peer review alert rules

### Remediation

**Immediate (0-5 minutes)**:
```bash
# Silence all alerts temporarily (use sparingly!)
amtool silence add alertname=~".+"  --duration=30m --comment="Alert storm mitigation"

# Or silence specific pattern
amtool silence add alertname=~"Pipeline.*"
```

**Short-term (5-30 minutes)**:
```bash
# Disable faulty alert rule
kubectl edit prometheusrule pipeline-alerts
# Comment out problematic rule

# Reload Prometheus
curl -X POST http://prometheus:9090/-/reload
```

**Long-term (30+ minutes)**:
- Fix root cause
- Improve alert inhibition rules:
  ```yaml
  inhibit_rules:
    - source_match:
        alertname: NodeDown
      target_match_re:
        alertname: Pod.*
      equal: ['node']
  ```
- Review and optimize alert thresholds
- Implement alert fatigue monitoring

### Escalation

- **Unable to identify root cause**: Create incident, assemble team
- **Customer impact**: Notify customer success immediately

---

## Runbook 8: Metrics Not Appearing

**Alert**: `MetricIngestionRate = 0` or user report

### Symptoms
- Dashboard panels showing "No data"
- Metrics suddenly disappeared
- New metrics not appearing
- Gaps in time series

### Investigation Steps

1. **Check Data Flow**
   ```bash
   # Is OTel Collector receiving data?
   curl http://otel-collector:8888/metrics | grep receiver

   # Is Prometheus scraping OTel?
   curl http://prometheus:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="otel-collector")'

   # Are metrics being exported?
   curl http://otel-collector:8888/metrics | grep exporter
   ```

2. **Check for Errors**
   ```bash
   # OTel Collector logs
   kubectl logs -n observability deployment/otel-collector | grep error

   # Prometheus logs
   kubectl logs -n observability statefulset/prometheus | grep error
   ```

3. **Verify Configuration**
   ```bash
   # OTel config
   kubectl get configmap otel-collector-config -o yaml

   # Prometheus config
   kubectl get configmap prometheus-config -o yaml | grep otel
   ```

### Common Causes

**Cause 1: OTel Collector Down**
- Symptoms: All metrics stopped
- Solution: Restart OTel Collector
- Prevention: Ensure HA with multiple replicas

**Cause 2: Endpoint Changed**
- Symptoms: Metrics stopped after deployment
- Solution: Update exporter endpoint
- Prevention: Use service names, not IPs

**Cause 3: Firewall/Network Policy**
- Symptoms: Connection refused errors
- Solution: Fix network policy
- Prevention: Test connectivity in staging

**Cause 4: Memory Limit Reached**
- Symptoms: OTel Collector OOM killed
- Solution: Increase memory limit
- Prevention: Monitor collector resource usage

### Remediation

**Immediate (0-5 minutes)**:
```bash
# Restart OTel Collector
kubectl rollout restart deployment/otel-collector -n observability

# Force Prometheus scrape
curl -X POST http://prometheus:9090/-/reload
```

**Short-term (5-30 minutes)**:
```bash
# Increase OTel memory
kubectl edit deployment otel-collector
# Change: memory: "4Gi" (from 2Gi)

# Check network connectivity
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- bash
# Inside pod: telnet otel-collector 4317
```

**Long-term (30+ minutes)**:
- Add alerting for metric ingestion rate
- Implement synthetic metrics for monitoring
- Set up redundant collection paths
- Document all endpoints and configs

### Escalation

- **Data loss >1 hour**: High severity incident
- **Cannot restore metrics**: Involve platform team

---

## Runbook 9: Disk Space Critical

**Alert**: `DiskUsage > 95%` on observability components

### Symptoms
- Pod in CrashLoopBackOff
- "No space left on device" errors
- Write operations failing
- Component cannot start

### Investigation Steps

1. **Identify Affected Component**
   ```bash
   # Check all PVCs
   kubectl get pvc -n observability

   # Check disk usage per pod
   kubectl exec -it -n observability <pod-name> -- df -h
   ```

2. **Find Large Files/Directories**
   ```bash
   # Inside pod
   du -sh /* | sort -rh | head -n 10

   # Prometheus WAL size
   du -sh /prometheus/wal

   # Loki chunks
   du -sh /loki/chunks
   ```

### Common Causes

**Cause 1: WAL Not Being Compacted**
- Symptoms: /prometheus/wal very large
- Solution: Force compaction
- Prevention: Monitor WAL size

**Cause 2: Logs Not Rotated**
- Symptoms: /var/log full of old logs
- Solution: Delete old logs, configure logrotate
- Prevention: Set up log rotation

**Cause 3: Temp Files**
- Symptoms: /tmp full
- Solution: Clean /tmp directory
- Prevention: Add cleanup job

**Cause 4: PVC Too Small**
- Symptoms: Legitimate data usage at capacity
- Solution: Expand PVC
- Prevention: Monitor growth rate, size appropriately

### Remediation

**Immediate (0-5 minutes)**:
```bash
# Emergency cleanup - delete oldest data
kubectl exec -it prometheus-0 -- sh -c 'rm -rf /prometheus/01*'

# Or clean temp files
kubectl exec -it loki-0 -- sh -c 'rm -rf /tmp/*'

# Restart pod to recover
kubectl delete pod prometheus-0
```

**Short-term (5-30 minutes)**:
```bash
# Expand PVC (if supported by storage class)
kubectl patch pvc prometheus-data -p '{"spec":{"resources":{"requests":{"storage":"750Gi"}}}}'

# Or create new larger PVC and migrate
```

**Long-term (30+ minutes)**:
- Set up automatic PVC expansion
- Implement better retention policies
- Add disk usage monitoring and alerts at 70%, 80%, 90%
- Schedule regular cleanup jobs

### Escalation

- **Disk at 98%+**: Emergency, data loss imminent
- **PVC expansion not working**: Involve storage team

---

## Runbook 10: Automated Recovery Failing

**Alert**: `RecoveryFailureRate > 50%`

### Symptoms
- recovery_failure_total metric increasing
- Workflows not being automatically retried
- Circuit breaker stuck in OPEN state
- Webhook endpoint returning errors

### Investigation Steps

1. **Check Recovery Service Health**
   ```bash
   # Pod status
   kubectl get pods -l app=backend

   # Recent logs
   kubectl logs -l app=backend | grep recovery

   # Health endpoint
   curl http://backend:8080/api/v1/observability/alerts/health
   ```

2. **Review Recovery Metrics**
   ```promql
   # Success rate
   sum(rate(recovery_success_total[5m])) /
   sum(rate(recovery_attempts_total[5m]))

   # Failure reasons
   sum(rate(recovery_failure_total[5m])) by (strategy)

   # Circuit breaker state
   circuit_breaker_state{service="github-api"}
   ```

3. **Check GitHub API Access**
   ```bash
   # Test GitHub token
   curl -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/rate_limit

   # Check if token expired
   kubectl get secret github-token -o jsonpath='{.data.GITHUB_TOKEN}' | base64 -d
   ```

### Common Causes

**Cause 1: GitHub Token Expired/Invalid**
- Symptoms: All recoveries failing, 401 errors
- Solution: Update GitHub token
- Prevention: Set up token rotation, expiry monitoring

**Cause 2: Circuit Breaker OPEN**
- Symptoms: Recoveries rejected immediately
- Solution: Reset circuit breaker or wait for timeout
- Prevention: Investigate why circuit opened

**Cause 3: Webhook Not Reaching Service**
- Symptoms: No recovery attempts logged
- Solution: Check AlertManager webhook config, network
- Prevention: Add synthetic health checks

**Cause 4: Recovery Logic Bug**
- Symptoms: Specific alert type always failing
- Solution: Fix bug in recovery handler
- Prevention: Add more comprehensive tests

### Remediation

**Immediate (0-5 minutes)**:
```bash
# Reset circuit breaker (if admin endpoint exists)
curl -X POST http://backend:8080/api/v1/observability/circuit-breaker/reset?service=github-api

# Or restart service
kubectl rollout restart deployment/backend

# Manual workflow retry as workaround
gh workflow run <workflow-name>
```

**Short-term (5-30 minutes)**:
```bash
# Update GitHub token
kubectl create secret generic github-token \
  --from-literal=GITHUB_TOKEN=ghp_new_token \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment/backend

# Verify recovery working
kubectl logs -f deployment/backend | grep "Recovery succeeded"
```

**Long-term (30+ minutes)**:
- Add token expiry monitoring
- Implement automatic token rotation
- Add comprehensive recovery tests
- Set up synthetic recovery tests (inject failures to test)
- Improve error handling and retry logic

### Escalation

- **All automated recovery broken**: High severity incident
- **Cannot restore functionality**: Manual intervention required, notify team

---

## General Troubleshooting Tips

### When Everything is Broken
1. Start with infrastructure: Are nodes/pods healthy?
2. Check external dependencies: GitHub, npm, Docker Hub status pages
3. Review recent changes: Deployments, config updates
4. Correlate with time: When did it start? What else happened?
5. Create incident: Assemble team if scope unclear

### Data Collection for Incidents
```bash
# Collect all relevant info in one go
mkdir incident-$(date +%Y%m%d-%H%M)
cd incident-$(date +%Y%m%d-%H%M)

# Logs
kubectl logs -n observability --all-containers --prefix --timestamps > logs.txt

# Pod status
kubectl get pods -n observability -o wide > pods.txt

# Events
kubectl get events -n observability --sort-by='.lastTimestamp' > events.txt

# Metrics snapshot
curl http://prometheus:9090/api/v1/query?query=up > metrics.json

# Create tarball
cd .. && tar -czf incident-$(date +%Y%m%d-%H%M).tar.gz incident-$(date +%Y%m%d-%H%M)
```

### Communication Templates

**Slack Incident Announcement**:
```
:rotating_light: **INCIDENT: <Title>**
*Severity*: [Critical/High/Medium]
*Impact*: <Who/what is affected>
*Started*: <Time>
*Incident Commander*: @person
*Status Channel*: #incident-YYYY-MM-DD

Updates will be posted every 15 minutes.
```

**Incident Update**:
```
**Update** [HH:MM] - <Status>
- <What we've learned>
- <What we're trying next>
- <ETA if known>
```

**Resolution Message**:
```
:white_check_mark: **RESOLVED**
*Root Cause*: <Brief explanation>
*Resolution*: <What fixed it>
*Duration*: <X hours Y minutes>
*Action Items*: <Link to postmortem doc>

Thanks to @person1 @person2 for quick response!
```

---

## Quick Reference: Alert Severity Levels

| Severity | Response Time | Who Responds | Example |
|----------|---------------|--------------|---------|
| **Critical** | < 5 min | On-call engineer | Production down, data loss |
| **High** | < 15 min | Team + Slack | Multiple workflows failing |
| **Medium** | < 1 hour | Team via Slack | Single workflow failing |
| **Low** | Next business day | Review in standup | Slow query, minor degradation |

---

## Contact Information

- **On-Call**: PagerDuty escalation policy
- **DevOps Team**: #devops-team
- **Incidents**: #incidents
- **Questions**: #observability-help

**Runbook Feedback**: Create PR or ping @observability-team

---

**Last Updated**: 2025-10-22
**Version**: 1.0
**Next Review**: 2025-11-22
