# Prometheus Backup Docker Image

Custom Docker image for creating automated Prometheus TSDB snapshots and uploading them to S3 with intelligent retention management.

## Overview

- **Base Image**: Alpine Linux 3.19
- **Purpose**: Daily Prometheus backup automation
- **Storage**: AWS S3 with server-side encryption
- **Retention**: 30 daily, 12 monthly, 3 yearly backups

## Build

```bash
cd infrastructure/docker/prometheus-backup
docker build -t health-tracker/prometheus-backup:1.0.0 .
```

## Features

- **Snapshot Creation**: Uses Prometheus Admin API to create TSDB snapshots
- **S3 Upload**: Encrypted uploads to S3 with metadata tagging
- **Retention Management**: Automatic cleanup based on configurable policies
- **Backup Verification**: Validates uploaded backups for integrity
- **Error Handling**: Comprehensive error checking and logging

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PROMETHEUS_URL` | `http://prometheus-0.prometheus.observability.svc.cluster.local:9090` | Prometheus server URL |
| `S3_BUCKET` | `health-tracker-prometheus-backups` | S3 bucket name |
| `S3_REGION` | `us-east-1` | AWS region |
| `S3_PREFIX` | `prometheus-snapshots` | S3 key prefix |
| `RETENTION_DAILY` | `30` | Number of daily backups to keep |
| `RETENTION_MONTHLY` | `12` | Number of monthly backups to keep |
| `RETENTION_YEARLY` | `3` | Number of yearly backups to keep |
| `VERIFY_BACKUP` | `true` | Enable backup verification |
| `AWS_ACCESS_KEY_ID` | - | AWS access key (from secret) |
| `AWS_SECRET_ACCESS_KEY` | - | AWS secret key (from secret) |

## Backup Workflow

1. **Create Snapshot**: Calls `/api/v1/admin/tsdb/snapshot` on Prometheus
2. **Generate Metadata**: Creates backup metadata with timestamp and info
3. **Upload to S3**: Encrypts and uploads snapshot data to S3
4. **Verify Upload**: Downloads and validates uploaded data
5. **Apply Retention**: Removes old backups based on retention policy
6. **Cleanup**: Marks snapshot as backed up (Prometheus handles local cleanup)

## Retention Policy

The script implements a tiered retention strategy:

- **Daily Backups**: All backups from the last 30 days
- **Monthly Backups**: Backups from the 1st of each month for the last 12 months
- **Yearly Backups**: Backups from January 1st for the last 3 years

Example retention with daily backups:
- Day 1-30: All daily backups kept
- Day 31+: Only 1st of month kept
- Month 13+: Only January 1st kept
- Year 4+: Deleted

## S3 Bucket Structure

```
s3://health-tracker-prometheus-backups/
└── prometheus-snapshots/
    ├── backup-20250122-020000/
    │   └── metadata.json
    ├── backup-20250121-020000/
    │   └── metadata.json
    └── backup-20250120-020000/
        └── metadata.json
```

## Metadata Format

Each backup includes a `metadata.json` file:

```json
{
  "snapshot_name": "20250122T020000Z-1a2b3c4d",
  "backup_id": "backup-20250122-020000",
  "timestamp": "2025-01-22T02:00:00Z",
  "prometheus_url": "http://prometheus-0.prometheus.observability.svc.cluster.local:9090",
  "retention_time": "90d",
  "storage_size_bytes": 0
}
```

## S3 Object Tagging

Backups are tagged for retention management:

- `Type`: `daily`
- `Date`: `2025-01-22`
- `Month`: `2025-01`
- `Year`: `2025`
- `SnapshotName`: `20250122T020000Z-1a2b3c4d`

## Testing

### Local Testing

```bash
# Set required environment variables
export PROMETHEUS_URL="http://localhost:9090"
export S3_BUCKET="test-bucket"
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"

# Run backup script
docker run --rm \
  -e PROMETHEUS_URL \
  -e S3_BUCKET \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  health-tracker/prometheus-backup:1.0.0
```

### Test Snapshot Creation

```bash
# Manually trigger snapshot
curl -X POST http://localhost:9090/api/v1/admin/tsdb/snapshot

# Expected response:
# {"status":"success","data":{"name":"20250122T020000Z-1a2b3c4d"}}
```

## Security

- **Non-root User**: Runs as UID 65534 (nobody)
- **Read-only Filesystem**: Minimal write access
- **Secret Management**: AWS credentials from Kubernetes secrets
- **Encryption**: S3 server-side encryption (AES-256)
- **Network**: No privileged ports or capabilities

## Monitoring

The backup job logs all operations:

```
[2025-01-22 02:00:00] === Prometheus Backup Started ===
[2025-01-22 02:00:00] Prometheus URL: http://prometheus-0...
[2025-01-22 02:00:00] S3 Bucket: s3://health-tracker-prometheus-backups/prometheus-snapshots
[2025-01-22 02:00:00] Retention: 30 daily, 12 monthly, 3 yearly
[2025-01-22 02:00:01] Creating Prometheus snapshot...
[2025-01-22 02:00:05] Snapshot created: 20250122T020000Z-1a2b3c4d
[2025-01-22 02:00:05] Retrieving snapshot information...
[2025-01-22 02:00:05] Uploading snapshot to S3...
[2025-01-22 02:00:10] Upload successful: s3://health-tracker-prometheus-backups/prometheus-snapshots/backup-20250122-020000
[2025-01-22 02:00:10] Verifying backup integrity...
[2025-01-22 02:00:12] Backup verified successfully: backup-20250122-020000
[2025-01-22 02:00:12] Applying retention policies...
[2025-01-22 02:00:15] Retention policy applied. Deleted 1 old backup(s)
[2025-01-22 02:00:15] Snapshot backed up successfully: 20250122T020000Z-1a2b3c4d -> s3://...
[2025-01-22 02:00:15] === Prometheus Backup Completed Successfully ===
```

## Troubleshooting

### Snapshot Creation Fails

```bash
# Check Prometheus admin API is enabled
kubectl exec -n observability prometheus-0 -- \
  wget -O- http://localhost:9090/api/v1/status/flags | grep enable-admin-api

# Should show: --web.enable-admin-api
```

### S3 Upload Fails

```bash
# Verify S3 credentials
kubectl get secret -n observability prometheus-backup-s3-credentials -o yaml

# Test S3 access
aws s3 ls s3://health-tracker-prometheus-backups/ --region us-east-1
```

### Retention Not Working

```bash
# Check S3 object tags
aws s3api get-object-tagging \
  --bucket health-tracker-prometheus-backups \
  --key prometheus-snapshots/backup-20250122-020000/metadata.json

# Manually trigger retention (dry run)
kubectl create job -n observability \
  prometheus-backup-manual \
  --from=cronjob/prometheus-backup
```

## References

- [Prometheus Snapshot API](https://prometheus.io/docs/prometheus/latest/querying/api/#snapshot)
- [AWS S3 CLI Reference](https://docs.aws.amazon.com/cli/latest/reference/s3/)
- [Kubernetes CronJobs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
