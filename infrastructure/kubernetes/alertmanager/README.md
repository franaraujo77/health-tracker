# AlertManager Kubernetes Deployment

Prometheus AlertManager deployment for intelligent alert routing and notification management in the Health Tracker observability stack.

## Overview

- **Deployment**: StatefulSet with 2 replicas (HA)
- **Clustering**: Gossip protocol for alert deduplication
- **Namespace**: observability
- **Storage**: 10Gi persistent volume per replica

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Prometheus    │────────▶│  AlertManager-0  │
│   (evaluates    │         │  (gossip mesh)   │
│   alert rules)  │────────▶│  AlertManager-1  │
└─────────────────┘         └──────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
              ┌──────────┐    ┌───────────┐   ┌──────────┐
              │ PagerDuty│    │   Slack   │   │  Email   │
              │(critical)│    │(high/med) │   │(low/all) │
              └──────────┘    └───────────┘   └──────────┘
```

## Deployment

### Prerequisites

1. **Kubernetes cluster** with namespace `observability`
2. **Prometheus** deployed and configured
3. **Secrets configured** for Slack, PagerDuty, SMTP

### Step 1: Configure Secrets

Create the AlertManager secrets with actual credentials:

```bash
kubectl create secret generic alertmanager-secrets \
  --from-literal=slack-webhook-url='https://hooks.slack.com/services/YOUR_WEBHOOK' \
  --from-literal=pagerduty-service-key='YOUR_PAGERDUTY_KEY' \
  --from-literal=smtp-username='alertmanager@health-tracker.com' \
  --from-literal=smtp-password='YOUR_SMTP_PASSWORD' \
  --from-literal=smtp-host='smtp.example.com:587' \
  --from-literal=email-devops='devops-team@example.com' \
  --from-literal=email-oncall='oncall@example.com' \
  --namespace=observability
```

### Step 2: Validate Configuration

```bash
# Validate Kubernetes manifests
kubectl kustomize infrastructure/kubernetes/alertmanager/base
```

### Step 3: Deploy

```bash
# Deploy AlertManager
kubectl apply -k infrastructure/kubernetes/alertmanager/base

# Verify deployment
kubectl get statefulset -n observability alertmanager
kubectl get pods -n observability -l app=alertmanager
```

### Step 4: Verify HA Clustering

```bash
# Check cluster status on first replica
kubectl exec -n observability alertmanager-0 -- \
  wget -q -O- http://localhost:9093/api/v2/status

# Should show 2 peers in cluster
```

## Alert Routing

AlertManager routes alerts based on severity:

| Severity | Destination | Repeat Interval | Description |
|----------|-------------|----------------|-------------|
| **critical** | PagerDuty + Slack + Email | 15min | Immediate incident, pages on-call |
| **high** | Slack + Email | 4h | Urgent attention needed |
| **medium** | Slack | 4h | Should be addressed soon |
| **low** | Email | 4h | Informational |

### Routing Rules

```yaml
Critical Alert Flow:
  PipelineDown (critical)
    → PagerDuty (creates incident)
    → Slack #pipeline-alerts-high
    → Email (devops + oncall)

High Alert Flow:
  HighErrorRate (high)
    → Slack #pipeline-alerts-high
    → Email (devops + oncall)

Medium Alert Flow:
  WorkflowTimeout (medium)
    → Slack #pipeline-alerts-medium

Low Alert Flow:
  TestCoverageDropped (low)
    → Email (devops)
```

## Inhibition Rules

AlertManager suppresses redundant alerts using inhibition rules:

1. **Pipeline Down** inhibits **Workflow Alerts**
   - If entire pipeline is down, don't spam individual workflow failures

2. **Critical** inhibits **Warning** (same resource)
   - If disk is at 95% (critical), suppress 85% warning

3. **Cluster Down** inhibits **Node Alerts**
   - If cluster unreachable, suppress node-specific alerts

## Silence Management

### Create Silence (Maintenance Window)

```bash
# Silence all alerts for 2 hours during maintenance
amtool --alertmanager.url=http://alertmanager.observability.svc.cluster.local:9093 \
  silence add \
  alertname=~".+" \
  --duration=2h \
  --author="DevOps Team" \
  --comment="Scheduled maintenance window"
```

### Create Targeted Silence

```bash
# Silence specific workflow alerts
amtool silence add \
  workflow=frontend-ci \
  --duration=1h \
  --author="Jane Doe" \
  --comment="Deploying frontend changes"
```

### List Active Silences

```bash
amtool silence query \
  --alertmanager.url=http://alertmanager.observability.svc.cluster.local:9093
```

### Expire Silence Early

```bash
amtool silence expire <silence-id>
```

## Alert Templates

AlertManager uses custom email templates for better readability:

- **email.default.tmpl**: Standard alert emails with color coding
- **email.high.tmpl**: Enhanced template for high-severity alerts with action buttons

Templates are stored in the `alertmanager-config` ConfigMap and mounted at `/etc/alertmanager/templates/`.

## Monitoring AlertManager

AlertManager exposes metrics on `:9093/metrics`:

```promql
# Alert processing rate
rate(alertmanager_alerts_received_total[5m])

# Active silences
alertmanager_silences

# Notification success rate
rate(alertmanager_notifications_total[5m])

# Notification failures
rate(alertmanager_notifications_failed_total[5m])
```

## Troubleshooting

### Alerts Not Being Sent

1. **Check AlertManager is receiving alerts from Prometheus:**
   ```bash
   kubectl logs -n observability alertmanager-0 | grep "Received alert"
   ```

2. **Verify Prometheus is sending to AlertManager:**
   ```bash
   kubectl logs -n observability prometheus-0 | grep alertmanager
   ```

3. **Check notification configuration:**
   ```bash
   kubectl exec -n observability alertmanager-0 -- \
     amtool config show
   ```

### Duplicate Alerts

- Check gossip clustering status - replicas should be in sync
- Verify both replicas can communicate on port 9094

### Slack/PagerDuty Not Working

1. **Test Slack webhook manually:**
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test from AlertManager"}' \
     YOUR_SLACK_WEBHOOK_URL
   ```

2. **Check AlertManager logs for errors:**
   ```bash
   kubectl logs -n observability alertmanager-0 | grep -i "error\|fail"
   ```

3. **Verify secrets are correct:**
   ```bash
   kubectl get secret -n observability alertmanager-secrets -o yaml
   ```

## Configuration Updates

AlertManager automatically reloads configuration when the ConfigMap changes (via config-reloader sidecar).

To update routing rules:

```bash
# Edit the ConfigMap
kubectl edit configmap -n observability alertmanager-config

# Verify reload succeeded (check logs)
kubectl logs -n observability alertmanager-0 -c config-reloader
kubectl logs -n observability alertmanager-0 -c alertmanager | tail -20
```

## HA Failover Testing

Test high availability by simulating failures:

```bash
# Delete one replica
kubectl delete pod -n observability alertmanager-0

# Verify alerts still route correctly
# Check remaining replica handles load
kubectl logs -n observability alertmanager-1 | grep "Received alert"

# Wait for replica to recover
kubectl get pods -n observability -l app=alertmanager -w
```

## Access AlertManager UI

```bash
# Port-forward to access UI
kubectl port-forward -n observability svc/alertmanager 9093:9093

# Open browser to http://localhost:9093
# - View active alerts
# - Manage silences
# - Check cluster status
```

## Integration with Grafana

AlertManager alerts are automatically displayed in Grafana dashboards via annotations. Configure Grafana datasource:

```yaml
- name: AlertManager
  type: camptocamp-prometheus-alertmanager-datasource
  access: proxy
  url: http://alertmanager.observability.svc.cluster.local:9093
```

## Best Practices

1. **Test alerts before deploying:**
   - Use `amtool` to validate configuration
   - Send test alerts to verify routing

2. **Use silences during maintenance:**
   - Create silences before planned work
   - Always add comments explaining why

3. **Monitor AlertManager health:**
   - Set up alerts for AlertManager itself
   - Check notification success rates

4. **Review and tune alert rules:**
   - Avoid alert fatigue with proper thresholds
   - Use inhibition rules to prevent storms
   - Adjust `for:` duration to reduce flapping

5. **Keep secrets secure:**
   - Never commit secrets to git
   - Use Sealed Secrets or external secret managers in production

## References

- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Alert Routing](https://prometheus.io/docs/alerting/latest/configuration/#route)
- [Notification Templates](https://prometheus.io/docs/alerting/latest/notifications/)
- [Prometheus Alert Rules](../prometheus/alert-rules.yaml)
