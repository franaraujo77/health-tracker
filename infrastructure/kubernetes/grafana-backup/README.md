# Grafana Dashboard Backup Kubernetes Deployment

Automated daily backups of Grafana dashboards to Git repository with version control and change tracking.

## Overview

- **Schedule**: Daily at 03:00 UTC
- **Method**: Grafana HTTP API dashboard export
- **Storage**: Git repository with full version history
- **Features**: Auto-commit, diff tracking, easy rollback

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   CronJob       │────────▶│  Backup Pod      │
│  (03:00 UTC)    │         │  (runs on-demand)│
└─────────────────┘         └──────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
              ┌──────────┐    ┌───────────┐   ┌──────────┐
              │ Grafana  │    │    Git    │   │  Commit  │
              │   API    │───▶│   Clone   │───▶│   Push   │
              │(export)  │    │(dashboards)│   │(changes) │
              └──────────┘    └───────────┘   └──────────┘
```

## Prerequisites

1. **Grafana Deployed** with dashboards configured
2. **Git Repository** accessible from Kubernetes cluster
3. **Grafana API Key** with Viewer role
4. **SSH Key Pair** for Git authentication (or Personal Access Token)
5. **Kubernetes Cluster** with CronJob support

## Deployment

### Step 1: Create Grafana API Key

In Grafana UI:

1. Navigate to **Configuration** → **API Keys**
2. Click **Add API Key**
3. Configure:
   - Name: `dashboard-backup-bot`
   - Role: **Viewer**
   - Time to live: No expiration
4. Click **Add** and copy the generated key

### Step 2: Generate SSH Key for Git

```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 \
  -C "grafana-backup@health-tracker.local" \
  -f grafana-backup-key \
  -N ""

# This creates:
# - grafana-backup-key (private key)
# - grafana-backup-key.pub (public key)
```

### Step 3: Add Public Key to Git Repository

**For GitHub:**

1. Go to repository **Settings** → **Deploy keys**
2. Click **Add deploy key**
3. Title: `Grafana Dashboard Backup Bot`
4. Key: Paste contents of `grafana-backup-key.pub`
5. ☑ **Allow write access**
6. Click **Add key**

**For GitLab:**

1. Go to **Settings** → **Repository** → **Deploy keys**
2. Add key with write permissions

**For Bitbucket:**

1. Go to **Repository settings** → **Access keys**
2. Add key

### Step 4: Create Kubernetes Secrets

```bash
# Create Grafana API key secret
kubectl create secret generic grafana-dashboard-backup-credentials \
  --from-literal=api_key='YOUR_GRAFANA_API_KEY_HERE' \
  --namespace=observability

# Create SSH key secret
kubectl create secret generic grafana-dashboard-backup-ssh-key \
  --from-file=id_rsa=./grafana-backup-key \
  --namespace=observability

# Verify secrets
kubectl get secrets -n observability | grep grafana-dashboard-backup
```

### Step 5: Update CronJob Configuration

Edit `cronjob.yaml` to set your Git repository URL:

```yaml
env:
  - name: GIT_REPO_URL
    value: "git@github.com:your-org/health-tracker.git"  # Update this
  - name: GIT_BRANCH
    value: "main"  # Or your preferred branch
```

### Step 6: Build Backup Docker Image

```bash
cd infrastructure/docker/grafana-backup
docker build -t health-tracker/grafana-backup:1.0.0 .

# Tag and push to your registry
docker tag health-tracker/grafana-backup:1.0.0 \
  your-registry.io/grafana-backup:1.0.0
docker push your-registry.io/grafana-backup:1.0.0
```

### Step 7: Deploy Backup CronJob

```bash
# Deploy all backup resources
kubectl apply -k infrastructure/kubernetes/grafana-backup/

# Verify deployment
kubectl get cronjob -n observability grafana-dashboard-backup
kubectl get serviceaccount -n observability grafana-dashboard-backup
```

## Manual Backup Trigger

To trigger a backup manually:

```bash
# Create a one-time job from the CronJob
kubectl create job -n observability \
  grafana-dashboard-backup-manual-$(date +%s) \
  --from=cronjob/grafana-dashboard-backup

# Watch job progress
kubectl get jobs -n observability -w

# View logs
kubectl logs -n observability job/grafana-dashboard-backup-manual-<timestamp>
```

## Backup Schedule

The CronJob runs daily at 03:00 UTC:

```yaml
schedule: "0 3 * * *"
```

To customize the schedule:

```bash
kubectl edit cronjob -n observability grafana-dashboard-backup

# Example schedules:
# Every 6 hours:  "0 */6 * * *"
# Every 12 hours: "0 */12 * * *"
# Twice daily:    "0 3,15 * * *"
# Weekly:         "0 3 * * 0"
# After changes:  Use webhook-triggered job instead
```

## Dashboard Versioning

All dashboard changes are tracked in Git:

```bash
# View dashboard change history
cd .github/dashboards
git log --oneline executive-dashboard.json

# See what changed in a specific commit
git show abc123:./github/dashboards/executive-dashboard.json

# Compare two versions
git diff abc123 def456 -- .github/dashboards/executive-dashboard.json

# Restore previous version
git checkout abc123 -- .github/dashboards/executive-dashboard.json
git commit -m "Restore executive dashboard to version abc123"
```

## Monitoring

### View Backup Jobs

```bash
# List recent backup jobs
kubectl get jobs -n observability -l app=grafana-dashboard-backup

# Check last 5 jobs status
kubectl get jobs -n observability -l app=grafana-dashboard-backup \
  --sort-by=.metadata.creationTimestamp | tail -5
```

### View Backup Logs

```bash
# Get latest job name
LATEST_JOB=$(kubectl get jobs -n observability -l app=grafana-dashboard-backup \
  --sort-by=.metadata.creationTimestamp -o name | tail -1)

# View logs
kubectl logs -n observability $LATEST_JOB
```

### Verify Git Commits

```bash
# Check recent backup commits
git log --grep="Grafana dashboard backup" --oneline | head -10

# View last backup
git show HEAD:.github/dashboards/backup-metadata.json
```

## Restoring Dashboards

### Restore Single Dashboard

```bash
# Method 1: Via Grafana API
DASHBOARD_FILE=".github/dashboards/executive-dashboard.json"
GRAFANA_URL="http://grafana.observability.svc.cluster.local:3000"
GRAFANA_API_KEY="your-api-key"

curl -X POST \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @"$DASHBOARD_FILE" \
  "$GRAFANA_URL/api/dashboards/db"
```

```bash
# Method 2: Via Grafana UI
# 1. Copy dashboard JSON from .github/dashboards/
# 2. In Grafana: Dashboards → Import → Paste JSON
# 3. Configure dashboard UID and folder
# 4. Click Import
```

### Restore All Dashboards

```bash
# Create restore script
cat > restore-all-dashboards.sh <<'EOF'
#!/bin/bash
GRAFANA_URL="http://grafana.observability.svc.cluster.local:3000"
GRAFANA_API_KEY="your-api-key"
DASHBOARD_DIR=".github/dashboards"

for dashboard in $DASHBOARD_DIR/*.json; do
  if [[ ! "$dashboard" =~ "backup-metadata" ]]; then
    echo "Restoring $(basename $dashboard)..."
    curl -s -X POST \
      -H "Authorization: Bearer $GRAFANA_API_KEY" \
      -H "Content-Type: application/json" \
      -d @"$dashboard" \
      "$GRAFANA_URL/api/dashboards/db" | jq .
  fi
done
EOF

chmod +x restore-all-dashboards.sh
./restore-all-dashboards.sh
```

### Restore from Specific Commit

```bash
# List commits
git log --oneline .github/dashboards/

# Checkout specific version
git checkout abc123 -- .github/dashboards/executive-dashboard.json

# Restore via API
curl -X POST \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @.github/dashboards/executive-dashboard.json \
  "$GRAFANA_URL/api/dashboards/db"
```

## Troubleshooting

### Backup Job Fails to Start

**Symptom**: CronJob doesn't create jobs

```bash
# Check CronJob configuration
kubectl describe cronjob -n observability grafana-dashboard-backup

# Verify service account exists
kubectl get sa -n observability grafana-dashboard-backup

# Check for suspend flag
kubectl get cronjob -n observability grafana-dashboard-backup \
  -o jsonpath='{.spec.suspend}'
```

### Grafana API Connection Failed

**Symptom**: Logs show "Failed to fetch dashboard list"

```bash
# Test Grafana API from within cluster
kubectl run -n observability curl-test -it --rm \
  --image=curlimages/curl:latest \
  -- curl -H "Authorization: Bearer YOUR_API_KEY" \
    http://grafana.observability.svc.cluster.local:3000/api/search

# Verify Grafana is running
kubectl get pods -n observability -l app=grafana

# Check Grafana service
kubectl get svc -n observability grafana
```

### Git Authentication Failed

**Symptom**: Logs show "Git clone failed" or "Permission denied (publickey)"

```bash
# Verify SSH key secret exists
kubectl get secret -n observability grafana-dashboard-backup-ssh-key

# Check SSH key format
kubectl get secret -n observability grafana-dashboard-backup-ssh-key \
  -o jsonpath='{.data.id_rsa}' | base64 -d | head -1
# Should show: -----BEGIN OPENSSH PRIVATE KEY-----

# Test SSH key access
kubectl run -n observability ssh-test -it --rm \
  --image=alpine:latest \
  -- sh -c "apk add openssh-client && ssh -T git@github.com -i /secrets/ssh/id_rsa"
```

### Git Push Rejected

**Symptom**: Logs show "Git push failed"

```bash
# Verify deploy key has write access (GitHub)
# Go to: Repository Settings → Deploy keys
# Ensure "Allow write access" is checked

# Check branch protection rules
# May need to add backup bot to allowed push users

# Verify remote URL is correct
kubectl get cronjob -n observability grafana-dashboard-backup \
  -o jsonpath='{.spec.jobTemplate.spec.template.spec.containers[0].env[?(@.name=="GIT_REPO_URL")].value}'
```

### No Dashboards Exported

**Symptom**: Backup runs but no dashboards in Git

```bash
# Check Grafana has dashboards
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://grafana.observability.svc.cluster.local:3000/api/search?type=dash-db

# Verify API key has correct permissions
# Role must be at least "Viewer"

# Check backup logs for errors
kubectl logs -n observability job/grafana-dashboard-backup-manual-xxx
```

### No Git Commit Created

**Symptom**: Job succeeds but no commit in Git

```bash
# This is expected if dashboards haven't changed
# The script only commits when changes are detected

# Force a manual backup to test
kubectl create job -n observability test-backup \
  --from=cronjob/grafana-dashboard-backup

# Check logs for "No changes detected"
kubectl logs -n observability job/test-backup
```

## Alerts for Backup Failures

Add Prometheus alert rules to monitor backup jobs:

```yaml
# In prometheus/alert-rules.yaml
- alert: GrafanaDashboardBackupFailed
  expr: |
    kube_job_status_failed{job_name=~"grafana-dashboard-backup.*"} > 0
  for: 5m
  labels:
    severity: medium
  annotations:
    summary: "Grafana dashboard backup job failed"
    description: "Backup job {{ $labels.job_name }} failed in namespace {{ $labels.namespace }}"

- alert: GrafanaDashboardBackupMissing
  expr: |
    time() - max(kube_job_status_completion_time{job_name=~"grafana-dashboard-backup.*"}) > 90000
  for: 1h
  labels:
    severity: medium
  annotations:
    summary: "Grafana dashboard backup not running"
    description: "No successful dashboard backup in last 25 hours"
```

## Webhook-Triggered Backup

For immediate backups after dashboard changes, set up a webhook:

```yaml
# webhook-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: grafana-dashboard-backup-webhook
  namespace: observability
spec:
  template:
    spec:
      serviceAccountName: grafana-dashboard-backup
      restartPolicy: Never
      # ... same container spec as CronJob ...
```

Trigger via webhook service:

```bash
# Expose webhook endpoint
kubectl expose deployment webhook-server -n observability \
  --type=LoadBalancer --port=8080

# Configure Grafana webhook
# URL: http://webhook-server.observability.svc.cluster.local:8080/backup-dashboards
# Event: Dashboard saved
```

## Security Best Practices

1. **API Key Rotation**: Rotate Grafana API keys every 90 days
2. **SSH Key Security**: Use dedicated SSH keys with minimal permissions
3. **Branch Protection**: Protect backup branch from force pushes
4. **Secret Management**: Use Sealed Secrets or External Secrets Operator in production
5. **Audit Logging**: Enable Git audit logs for backup commits
6. **Least Privilege**: API key should have only Viewer role

## Performance Tuning

### Backup Duration

Typical backup durations:

| Dashboard Count | Export Time | Git Operations | Total Time |
|----------------|-------------|----------------|------------|
| 1-5            | ~5s         | ~3s            | ~10s       |
| 10-20          | ~15s        | ~5s            | ~25s       |
| 50-100         | ~45s        | ~10s           | ~60s       |

### Resource Limits

For large Grafana instances:

```yaml
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

## Best Practices

1. **Test Restores**: Regularly test dashboard restoration process
2. **Change Review**: Setup PR notifications for dashboard changes
3. **Backup Branch**: Use dedicated branch (e.g., `grafana-backups`) instead of main
4. **Versioning**: Tag important dashboard versions
5. **Documentation**: Comment complex dashboard JSON with descriptions
6. **Validation**: Add CI checks to validate dashboard JSON syntax

## Integration with Grafana Provisioning

Use backups for automated Grafana provisioning:

```yaml
# grafana-deployment.yaml
volumes:
  - name: dashboards
    configMap:
      name: grafana-dashboards

# Sync dashboards from Git to ConfigMap via GitOps tool (ArgoCD, Flux)
```

## References

- [Grafana HTTP API](https://grafana.com/docs/grafana/latest/developers/http_api/)
- [Grafana Dashboard Provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/#dashboards)
- [GitHub Deploy Keys](https://docs.github.com/en/developers/overview/managing-deploy-keys)
- [Kubernetes CronJobs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
