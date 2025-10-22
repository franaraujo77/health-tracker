# Prometheus Backup Kubernetes Deployment

Automated daily backups of Prometheus TSDB snapshots to AWS S3 with intelligent retention management.

## Overview

- **Schedule**: Daily at 02:00 UTC
- **Method**: Prometheus Admin API snapshots
- **Storage**: AWS S3 with server-side encryption (AES-256)
- **Retention**: 30 daily, 12 monthly, 3 yearly backups
- **Verification**: Automated integrity checks after each backup

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   CronJob       │────────▶│  Backup Pod      │
│  (02:00 UTC)    │         │  (runs on-demand)│
└─────────────────┘         └──────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
              ┌──────────┐    ┌───────────┐   ┌──────────┐
              │Prometheus│    │    S3     │   │  Verify  │
              │ Snapshot │───▶│  Upload   │───▶│  Backup  │
              │   API    │    │  (AES256) │   │Integrity │
              └──────────┘    └───────────┘   └──────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │   Retention  │
                              │  Management  │
                              │ (30/12/3)    │
                              └──────────────┘
```

## Prerequisites

1. **Prometheus Deployed** with Admin API enabled (`--web.enable-admin-api`)
2. **S3 Bucket** created for backup storage
3. **AWS Credentials** with S3 write permissions
4. **Kubernetes Cluster** with CronJob support

## Deployment

### Step 1: Create S3 Bucket

```bash
# Create S3 bucket
aws s3 mb s3://health-tracker-prometheus-backups --region us-east-1

# Enable versioning (optional but recommended)
aws s3api put-bucket-versioning \
  --bucket health-tracker-prometheus-backups \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket health-tracker-prometheus-backups \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Set lifecycle policy for old backups (safety net)
aws s3api put-bucket-lifecycle-configuration \
  --bucket health-tracker-prometheus-backups \
  --lifecycle-configuration file://s3-lifecycle.json
```

Example `s3-lifecycle.json`:
```json
{
  "Rules": [
    {
      "Id": "DeleteOldBackups",
      "Status": "Enabled",
      "Prefix": "prometheus-snapshots/",
      "Expiration": {
        "Days": 1095
      }
    }
  ]
}
```

### Step 2: Configure AWS Credentials

Create Kubernetes secret with S3 credentials:

```bash
kubectl create secret generic prometheus-backup-s3-credentials \
  --from-literal=access_key_id='AKIAIOSFODNN7EXAMPLE' \
  --from-literal=secret_access_key='wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' \
  --namespace=observability
```

**Alternative**: Use IAM roles for Service Accounts (IRSA):

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus-backup
  namespace: observability
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/prometheus-backup-role
```

### Step 3: Build Backup Docker Image

```bash
cd infrastructure/docker/prometheus-backup
docker build -t health-tracker/prometheus-backup:1.0.0 .

# Tag and push to your registry
docker tag health-tracker/prometheus-backup:1.0.0 \
  your-registry.io/prometheus-backup:1.0.0
docker push your-registry.io/prometheus-backup:1.0.0
```

### Step 4: Deploy Backup CronJob

```bash
# Deploy all backup resources
kubectl apply -k infrastructure/kubernetes/prometheus/backup/

# Verify deployment
kubectl get cronjob -n observability prometheus-backup
kubectl get serviceaccount -n observability prometheus-backup
```

### Step 5: Verify Configuration

```bash
# Check CronJob schedule
kubectl get cronjob -n observability prometheus-backup -o yaml | grep schedule

# Verify secret exists
kubectl get secret -n observability prometheus-backup-s3-credentials

# Check service account
kubectl get serviceaccount -n observability prometheus-backup
```

## Manual Backup Trigger

To trigger a backup manually (useful for testing):

```bash
# Create a one-time job from the CronJob
kubectl create job -n observability \
  prometheus-backup-manual-$(date +%s) \
  --from=cronjob/prometheus-backup

# Watch job progress
kubectl get jobs -n observability -w

# View logs
kubectl logs -n observability job/prometheus-backup-manual-<timestamp>
```

## Backup Schedule

The CronJob runs daily at 02:00 UTC:

```yaml
schedule: "0 2 * * *"
```

To customize the schedule, edit the CronJob:

```bash
kubectl edit cronjob -n observability prometheus-backup

# Example schedules:
# Every 6 hours:  "0 */6 * * *"
# Every 12 hours: "0 */12 * * *"
# Twice daily:    "0 2,14 * * *"
# Weekly:         "0 2 * * 0"
```

## Retention Policy

The backup script automatically manages retention:

| Period | Retention | Backup Criteria |
|--------|-----------|-----------------|
| **Daily** | 30 days | All backups |
| **Monthly** | 12 months | Backups from 1st of month |
| **Yearly** | 3 years | Backups from January 1st |

**Example Timeline:**

```
Day 1-30:   Keep all daily backups
Day 31-365: Keep only 1st of month
Year 2-3:   Keep only January 1st
Year 4+:    Delete
```

To customize retention, set environment variables in CronJob:

```yaml
env:
  - name: RETENTION_DAILY
    value: "60"      # 60 days
  - name: RETENTION_MONTHLY
    value: "24"      # 24 months
  - name: RETENTION_YEARLY
    value: "5"       # 5 years
```

## Monitoring

### View Backup Jobs

```bash
# List recent backup jobs
kubectl get jobs -n observability -l app=prometheus-backup

# Check last 5 jobs status
kubectl get jobs -n observability -l app=prometheus-backup \
  --sort-by=.metadata.creationTimestamp | tail -5
```

### View Backup Logs

```bash
# Get latest job name
LATEST_JOB=$(kubectl get jobs -n observability -l app=prometheus-backup \
  --sort-by=.metadata.creationTimestamp -o name | tail -1)

# View logs
kubectl logs -n observability $LATEST_JOB
```

### Backup Success Metrics

Monitor these indicators:

```bash
# Check job completion status
kubectl get jobs -n observability -l app=prometheus-backup \
  -o jsonpath='{.items[*].status.conditions[?(@.type=="Complete")].status}'

# Count successful backups in last 30 days
kubectl get jobs -n observability -l app=prometheus-backup \
  --field-selector status.successful=1 \
  -o json | jq '.items | length'
```

### S3 Backup Verification

```bash
# List recent backups
aws s3 ls s3://health-tracker-prometheus-backups/prometheus-snapshots/ \
  --recursive --human-readable

# Check backup count
aws s3 ls s3://health-tracker-prometheus-backups/prometheus-snapshots/ \
  --recursive | grep metadata.json | wc -l

# Verify latest backup metadata
LATEST_BACKUP=$(aws s3 ls s3://health-tracker-prometheus-backups/prometheus-snapshots/ \
  | sort | tail -1 | awk '{print $2}')
aws s3 cp s3://health-tracker-prometheus-backups/prometheus-snapshots/${LATEST_BACKUP}metadata.json -
```

## Alerts for Backup Failures

Add Prometheus alert rules to monitor backup jobs:

```yaml
# In prometheus/alert-rules.yaml
- alert: PrometheusBackupFailed
  expr: |
    kube_job_status_failed{job_name=~"prometheus-backup.*"} > 0
  for: 5m
  labels:
    severity: high
  annotations:
    summary: "Prometheus backup job failed"
    description: "Backup job {{ $labels.job_name }} failed in namespace {{ $labels.namespace }}"

- alert: PrometheusBackupMissing
  expr: |
    time() - max(kube_job_status_completion_time{job_name=~"prometheus-backup.*"}) > 90000
  for: 1h
  labels:
    severity: high
  annotations:
    summary: "Prometheus backup not running"
    description: "No successful backup in last 25 hours"
```

## Restore Procedure

See the main disaster recovery README for detailed restore steps.

Quick restore overview:

```bash
# 1. List available backups
aws s3 ls s3://health-tracker-prometheus-backups/prometheus-snapshots/

# 2. Download backup
aws s3 cp \
  s3://health-tracker-prometheus-backups/prometheus-snapshots/backup-20250122-020000/ \
  /restore-data/ \
  --recursive

# 3. Stop Prometheus
kubectl scale statefulset -n observability prometheus --replicas=0

# 4. Restore data (see DR runbook for details)
# ... restoration steps ...

# 5. Start Prometheus
kubectl scale statefulset -n observability prometheus --replicas=2
```

## Troubleshooting

### Backup Job Fails to Start

**Symptom**: CronJob doesn't create jobs

```bash
# Check CronJob configuration
kubectl describe cronjob -n observability prometheus-backup

# Verify service account exists
kubectl get sa -n observability prometheus-backup

# Check for suspend flag
kubectl get cronjob -n observability prometheus-backup -o jsonpath='{.spec.suspend}'
```

### Snapshot Creation Fails

**Symptom**: Logs show "Failed to create snapshot"

```bash
# Verify Prometheus admin API is enabled
kubectl exec -n observability prometheus-0 -- \
  wget -qO- http://localhost:9090/api/v1/status/flags | grep enable-admin-api

# Check Prometheus logs
kubectl logs -n observability prometheus-0 -c prometheus

# Test snapshot API manually
kubectl exec -n observability prometheus-0 -- \
  curl -X POST http://localhost:9090/api/v1/admin/tsdb/snapshot
```

### S3 Upload Fails

**Symptom**: Logs show "Upload failed"

```bash
# Verify S3 credentials
kubectl get secret -n observability prometheus-backup-s3-credentials -o yaml

# Check S3 bucket exists
aws s3 ls s3://health-tracker-prometheus-backups/

# Test S3 access from pod
kubectl run -n observability aws-test -it --rm \
  --image=amazon/aws-cli:latest \
  --env="AWS_ACCESS_KEY_ID=..." \
  --env="AWS_SECRET_ACCESS_KEY=..." \
  -- s3 ls s3://health-tracker-prometheus-backups/

# Check IAM permissions (if using IRSA)
aws iam get-role-policy --role-name prometheus-backup-role --policy-name s3-access
```

### Backup Verification Fails

**Symptom**: Logs show "Verification failed"

```bash
# Check S3 object exists
aws s3 ls s3://health-tracker-prometheus-backups/prometheus-snapshots/backup-20250122-020000/

# Download and inspect metadata
aws s3 cp \
  s3://health-tracker-prometheus-backups/prometheus-snapshots/backup-20250122-020000/metadata.json \
  - | jq .

# Verify object tags
aws s3api get-object-tagging \
  --bucket health-tracker-prometheus-backups \
  --key prometheus-snapshots/backup-20250122-020000/metadata.json
```

### Retention Policy Not Deleting Old Backups

**Symptom**: Old backups not being cleaned up

```bash
# Check retention environment variables
kubectl get cronjob -n observability prometheus-backup \
  -o jsonpath='{.spec.jobTemplate.spec.template.spec.containers[0].env}'

# Manually trigger retention (create test job)
kubectl create job -n observability test-retention \
  --from=cronjob/prometheus-backup

# View retention logs
kubectl logs -n observability job/test-retention | grep -i retention
```

### Job Quota Exceeded

**Symptom**: "Error creating: jobs.batch is forbidden: exceeded quota"

```bash
# Check resource quotas
kubectl describe resourcequota -n observability

# Clean up old completed jobs
kubectl delete jobs -n observability \
  -l app=prometheus-backup \
  --field-selector status.successful=1

# Adjust job history limits
kubectl patch cronjob -n observability prometheus-backup \
  -p '{"spec":{"successfulJobsHistoryLimit":3,"failedJobsHistoryLimit":1}}'
```

## Security Best Practices

1. **Use IAM Roles for Service Accounts (IRSA)** instead of static credentials
2. **Enable S3 bucket encryption** at rest
3. **Use S3 bucket policies** to restrict access
4. **Enable S3 versioning** for accidental deletion protection
5. **Audit S3 access** with CloudTrail
6. **Rotate credentials** regularly
7. **Use least-privilege IAM policies**

Example IAM policy for backup job:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject",
        "s3:GetObjectTagging",
        "s3:PutObjectTagging"
      ],
      "Resource": [
        "arn:aws:s3:::health-tracker-prometheus-backups",
        "arn:aws:s3:::health-tracker-prometheus-backups/*"
      ]
    }
  ]
}
```

## Performance Tuning

### Backup Duration

Typical backup durations by TSDB size:

| TSDB Size | Snapshot Time | Upload Time | Total Time |
|-----------|---------------|-------------|------------|
| 10 GB     | ~5s           | ~30s        | ~45s       |
| 50 GB     | ~15s          | ~2m         | ~2m 30s    |
| 100 GB    | ~30s          | ~5m         | ~6m        |
| 500 GB    | ~2m           | ~25m        | ~30m       |

### Resource Limits

Adjust pod resources based on backup size:

```yaml
resources:
  requests:
    cpu: 500m        # For large backups
    memory: 1Gi      # For compression/verification
  limits:
    cpu: 2000m
    memory: 2Gi
```

### Concurrent Backups

To prevent overlapping jobs:

```yaml
concurrencyPolicy: Forbid  # Don't start if previous job still running
```

## Cost Optimization

### S3 Storage Classes

Use appropriate storage classes to reduce costs:

```yaml
# In backup script
--storage-class STANDARD_IA    # Infrequent Access (cheaper)
--storage-class GLACIER        # Archive (cheapest, slower retrieval)
```

### Compression

Enable compression for smaller backup sizes:

```bash
# Prometheus already uses compression in TSDB
# S3 transfer compression is handled by AWS CLI
```

### Lifecycle Policies

Automate transitions to cheaper storage:

```json
{
  "Rules": [
    {
      "Id": "TransitionToIA",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

## References

- [Prometheus Snapshot API](https://prometheus.io/docs/prometheus/latest/querying/api/#snapshot)
- [Kubernetes CronJobs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
- [AWS S3 Backup Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/backup-best-practices.html)
- [IAM Roles for Service Accounts](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
