# Loki Kubernetes Deployment

This directory contains Kubernetes manifests for deploying Grafana Loki in the Health Tracker observability stack.

## Overview

- **Deployment Type**: StatefulSet (single-binary mode)
- **Storage Backend**: AWS S3
- **Retention Period**: 30 days
- **Namespace**: observability
- **Resource Allocation**: 1-2 CPU, 2-4Gi memory

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 Loki StatefulSet                 │
│  ┌──────────────────────────────────────────┐   │
│  │  Pod: loki-0                              │   │
│  │  ┌────────────┐  ┌────────────┐          │   │
│  │  │ Distributor│  │  Ingester  │          │   │
│  │  └─────┬──────┘  └─────┬──────┘          │   │
│  │        │                │                  │   │
│  │  ┌─────▼──────┐  ┌─────▼──────┐          │   │
│  │  │  Querier   │  │ Compactor  │          │   │
│  │  └────────────┘  └────────────┘          │   │
│  │                                            │   │
│  │  Volumes:                                  │   │
│  │  - /loki/data (PVC - 50Gi)                │   │
│  │  - /loki/wal  (PVC - 50Gi)                │   │
│  └──────────────┬───────────────────────────┘   │
└─────────────────┼───────────────────────────────┘
                  │
                  ▼
            ┌──────────┐
            │ AWS S3   │
            │ Bucket   │
            └──────────┘
```

## Prerequisites

### 1. Kubernetes Cluster
- Kubernetes 1.21+
- StorageClass with dynamic provisioning

### 2. AWS S3 Bucket
Create S3 bucket for log storage:
```bash
aws s3 mb s3://loki-logs-health-tracker --region us-east-1
aws s3api put-bucket-encryption \
  --bucket loki-logs-health-tracker \
  --server-side-encryption-configuration \
  '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'
```

### 3. AWS IAM Permissions
Create IAM policy for S3 access:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::loki-logs-health-tracker",
        "arn:aws:s3:::loki-logs-health-tracker/*"
      ]
    }
  ]
}
```

## Deployment

### Option 1: Using Kustomize
```bash
# Validate manifests
kubectl kustomize infrastructure/kubernetes/loki/base

# Apply to cluster
kubectl apply -k infrastructure/kubernetes/loki/base

# Verify deployment
./infrastructure/kubernetes/loki/tests/validate-deployment.sh
```

### Option 2: Using kubectl
```bash
# Apply manifests individually
kubectl apply -f infrastructure/kubernetes/loki/base/namespace.yaml
kubectl apply -f infrastructure/kubernetes/loki/base/serviceaccount.yaml
kubectl apply -f infrastructure/kubernetes/loki/base/configmap.yaml
kubectl apply -f infrastructure/kubernetes/loki/base/secret.yaml
kubectl apply -f infrastructure/kubernetes/loki/base/service.yaml
kubectl apply -f infrastructure/kubernetes/loki/base/statefulset.yaml
```

## Configuration

### S3 Credentials
Update the secret with your AWS credentials:
```bash
kubectl create secret generic loki-s3-credentials \
  --from-literal=access-key-id=YOUR_ACCESS_KEY \
  --from-literal=secret-access-key=YOUR_SECRET_KEY \
  -n observability
```

**Recommended**: Use IAM Roles for Service Accounts (IRSA) instead:
```yaml
# Update serviceaccount.yaml annotation
eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/loki-s3-access
```

### Custom Configuration
Edit `configmap.yaml` to customize:
- Retention period
- Storage limits
- Query limits
- Label cardinality limits

## Validation

Run the validation script:
```bash
chmod +x infrastructure/kubernetes/loki/tests/validate-deployment.sh
./infrastructure/kubernetes/loki/tests/validate-deployment.sh
```

Expected output:
```
=== Loki Deployment Validation ===

✓ Namespace 'observability' exists
✓ StatefulSet 'loki' exists
✓ StatefulSet pods are ready
✓ All pods are running (1/1)
✓ All PVCs are bound (2/2)
✓ Service 'loki' exists
✓ Loki /ready endpoint is responsive
✓ Loki /metrics endpoint is responsive
✓ Test log sent successfully
✓ Test log query successful
✓ No significant errors in logs

=== Validation Complete ===
✓ Loki is deployed and operational
```

## Usage

### Sending Logs
```bash
# From within the cluster
curl -H "Content-Type: application/json" \
  -XPOST http://loki.observability.svc.cluster.local:3100/loki/api/v1/push \
  --data-raw '{"streams": [{"stream": {"job": "test"}, "values": [["'$(date +%s)000000000'", "log message"]]}]}'
```

### Querying Logs
```bash
# Query logs by job label
curl -G http://loki.observability.svc.cluster.local:3100/loki/api/v1/query \
  --data-urlencode 'query={job="test"}'

# Query with time range
curl -G http://loki.observability.svc.cluster.local:3100/loki/api/v1/query_range \
  --data-urlencode 'query={job="test"}' \
  --data-urlencode 'start='$(date -d '1 hour ago' +%s)000000000 \
  --data-urlencode 'end='$(date +%s)000000000
```

### LogQL Examples
```logql
# All logs from GitHub Actions workflows
{job="github-actions"}

# Error logs only
{job="github-actions"} |= "error"

# Logs with specific workflow
{job="github-actions", workflow="frontend-ci"}

# Count errors per minute
count_over_time({job="github-actions"} |= "error" [1m])

# Pattern matching
{job="github-actions"} |~ "failed|error|exception"
```

## Monitoring

### Metrics
Loki exposes Prometheus metrics at `:3100/metrics`:
- `loki_ingester_chunks_created_total` - Chunks created
- `loki_request_duration_seconds` - Request latency
- `loki_distributor_bytes_received_total` - Bytes ingested

### Health Checks
- Ready: `http://loki:3100/ready`
- Metrics: `http://loki:3100/metrics`
- Config: `http://loki:3100/config`

## Troubleshooting

### Pods not starting
```bash
# Check pod events
kubectl describe pod -n observability -l app=loki

# Check pod logs
kubectl logs -n observability -l app=loki --tail=100
```

### Storage issues
```bash
# Check PVC status
kubectl get pvc -n observability

# Check storage class
kubectl get storageclass

# Check disk usage
kubectl exec -n observability loki-0 -- df -h /loki/data
```

### S3 connection issues
```bash
# Test S3 access from pod
kubectl exec -n observability loki-0 -- wget -O- https://s3.amazonaws.com

# Check AWS credentials
kubectl get secret loki-s3-credentials -n observability -o yaml

# View Loki logs for S3 errors
kubectl logs -n observability loki-0 | grep -i s3
```

### High memory usage
- Reduce `wal.replay_memory_ceiling` in config
- Reduce chunk cache size
- Lower `max_query_parallelism`

### Slow queries
- Add label selectors to queries: `{job="x"}` not `{}`
- Reduce query time range
- Check label cardinality: high cardinality = slow queries

## Scaling

### Horizontal Scaling
Update StatefulSet replicas:
```bash
kubectl scale statefulset loki -n observability --replicas=3
```

**Note**: Requires distributed mode configuration changes.

### Vertical Scaling
Update resource requests/limits in `statefulset.yaml`:
```yaml
resources:
  requests:
    cpu: "2"
    memory: "4Gi"
  limits:
    cpu: "4"
    memory: "8Gi"
```

## Maintenance

### Backup
```bash
# Backup configuration
kubectl get configmap loki-config -n observability -o yaml > loki-config-backup.yaml

# S3 data is automatically replicated by AWS
```

### Updates
```bash
# Update image version
kubectl set image statefulset/loki loki=health-tracker/loki:NEW_VERSION -n observability

# Monitor rollout
kubectl rollout status statefulset/loki -n observability
```

### Cleanup
```bash
# Delete Loki deployment
kubectl delete -k infrastructure/kubernetes/loki/base

# Delete PVCs (data loss!)
kubectl delete pvc -n observability -l app=loki
```

## Integration

### With Grafana
Add Loki as a data source in Grafana:
```yaml
apiVersion: 1
datasources:
- name: Loki
  type: loki
  access: proxy
  url: http://loki.observability.svc.cluster.local:3100
  jsonData:
    maxLines: 1000
```

### With OpenTelemetry Collector
Configure OTel Collector to export logs to Loki:
```yaml
exporters:
  loki:
    endpoint: http://loki.observability.svc.cluster.local:3100/loki/api/v1/push
    tenant_id: github-actions
```

### With Tempo (Trace Correlation)
Enable trace ID correlation in Grafana:
```yaml
jsonData:
  derivedFields:
  - datasourceUid: tempo
    matcherRegex: "trace_id=(\\w+)"
    name: TraceID
    url: "$${__value.raw}"
```

## Security

- **Network Policies**: Restrict access to Loki service
- **RBAC**: Use least-privilege service account
- **Encryption**: Enable SSE on S3 bucket
- **Secrets Management**: Use External Secrets Operator or IRSA
- **Multi-tenancy**: Configure X-Scope-OrgID for tenant isolation

## References

- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Loki Storage](https://grafana.com/docs/loki/latest/storage/)
- [Loki Operations](https://grafana.com/docs/loki/latest/operations/)
