# Thanos S3 Long-Term Storage Setup

This guide explains how to configure Thanos sidecar for uploading Prometheus data to S3 for long-term, cost-effective storage.

## Architecture

```
┌──────────────────┐
│   Prometheus     │
│   (Local TSDB)   │──┐
│   90-day retention│  │
└──────────────────┘  │
                      │ shares volume
                      │
                      ▼
             ┌─────────────────┐
             │  Thanos Sidecar │
             │                 │
             │ • Uploads blocks│
             │ • Downsamples   │
             │ • Deduplicates  │
             └────────┬────────┘
                      │
                      ▼ upload every 2h
             ┌─────────────────┐
             │    S3 Bucket    │
             │                 │
             │ Unlimited       │
             │ Retention       │
             └─────────────────┘
```

## Benefits

### Cost Savings
- **Block storage**: ~$0.10/GB/month
- **S3 Standard-IA**: ~$0.0125/GB/month
- **Savings**: ~88% reduction for historical data
- **Example**: 1TB over 90 days = $100/mo vs. $11/mo

### Unlimited Retention
- Keep metrics for years without local storage pressure
- Query historical data alongside recent metrics
- Comply with long-term retention requirements

### Downsampling
- 5-minute resolution after 40 hours
- 1-hour resolution after 10 days
- Faster queries over long time ranges
- Further storage cost reduction

## Prerequisites

### 1. S3 Bucket

Create an S3 bucket for Prometheus data:

```bash
# Using AWS CLI
aws s3api create-bucket \
  --bucket prometheus-long-term-storage \
  --region us-east-1 \
  --create-bucket-configuration LocationConstraint=us-east-1

# Enable versioning (recommended)
aws s3api put-bucket-versioning \
  --bucket prometheus-long-term-storage \
  --versioning-configuration Status=Enabled

# Set lifecycle policy for cost optimization
aws s3api put-bucket-lifecycle-configuration \
  --bucket prometheus-long-term-storage \
  --lifecycle-configuration '{
    "Rules": [
      {
        "Id": "TransitionToIA",
        "Status": "Enabled",
        "Transitions": [
          {
            "Days": 30,
            "StorageClass": "STANDARD_IA"
          }
        ]
      }
    ]
  }'
```

### 2. IAM Permissions

#### Option A: IRSA (Recommended for EKS)

Create IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::prometheus-long-term-storage"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::prometheus-long-term-storage/*"
    }
  ]
}
```

Associate with service account:

```bash
# Create IAM role with web identity
eksctl create iamserviceaccount \
  --name prometheus \
  --namespace observability \
  --cluster your-cluster-name \
  --attach-policy-arn arn:aws:iam::ACCOUNT_ID:policy/PrometheusS3Access \
  --approve

# Annotate existing service account
kubectl annotate serviceaccount prometheus \
  -n observability \
  eks.amazonaws.com/role-arn=arn:aws:iam::ACCOUNT_ID:role/prometheus-s3-role
```

#### Option B: Access Keys (For non-EKS clusters)

```bash
# Create IAM user
aws iam create-user --user-name prometheus-s3

# Attach policy
aws iam attach-user-policy \
  --user-name prometheus-s3 \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/PrometheusS3Access

# Create access keys
aws iam create-access-key --user-name prometheus-s3
```

## Configuration

### 1. Create Object Storage Configuration

Create `objstore.yml`:

```yaml
type: S3
config:
  bucket: "prometheus-long-term-storage"
  endpoint: "s3.us-east-1.amazonaws.com"
  region: "us-east-1"
  # Optional: Server-side encryption
  sse_config:
    type: "SSE-S3"
  # Optional: Custom endpoint for S3-compatible storage
  # endpoint: "minio.example.com:9000"
  # insecure: false
```

### 2. Create Kubernetes Secrets

```bash
# Create objstore config secret
kubectl create secret generic thanos-objstore-config \
  -n observability \
  --from-file=objstore.yml=objstore.yml

# (Optional) Create credentials secret if not using IRSA
kubectl create secret generic thanos-objstore-secret \
  -n observability \
  --from-literal=access_key_id=YOUR_ACCESS_KEY \
  --from-literal=secret_access_key=YOUR_SECRET_KEY
```

### 3. Deploy Updated StatefulSet

The StatefulSet already includes the Thanos sidecar. Just apply the changes:

```bash
# Apply updated configuration
kubectl apply -f infrastructure/kubernetes/prometheus/statefulset.yaml

# Restart pods to pick up new configuration
kubectl rollout restart statefulset prometheus -n observability
```

## Verification

### 1. Check Sidecar Status

```bash
# Check all containers are running (should see 3/3)
kubectl get pods -n observability -l app=prometheus

# Expected output:
# NAME            READY   STATUS    RESTARTS   AGE
# prometheus-0    3/3     Running   0          2m
# prometheus-1    3/3     Running   0          2m

# Check Thanos sidecar logs
kubectl logs -n observability prometheus-0 -c thanos-sidecar --tail=50

# Should see messages like:
# level=info msg="uploaded block" block=01HXXX...
```

### 2. Verify S3 Uploads

```bash
# List objects in S3 bucket
aws s3 ls s3://prometheus-long-term-storage/ --recursive

# Should see directories like:
# 01HXX.../meta.json
# 01HXX.../index
# 01HXX.../chunks/

# Check upload timing (blocks uploaded every 2h)
aws s3 ls s3://prometheus-long-term-storage/ \
  | sort -k1,2 \
  | tail -10
```

### 3. Query Thanos Sidecar API

```bash
# Port forward to Thanos sidecar
kubectl port-forward -n observability prometheus-0 10902:10902

# Check status endpoint
curl http://localhost:10902/api/v1/status/flags | jq

# Check uploaded blocks
curl http://localhost:10902/api/v1/blocks | jq
```

### 4. Verify Downsampling

After data has been in S3 for >40 hours:

```bash
# Check for downsampled blocks (5m resolution)
aws s3 ls s3://prometheus-long-term-storage/ --recursive \
  | grep "5m"

# After 10 days, check for 1h resolution
aws s3 ls s3://prometheus-long-term-storage/ --recursive \
  | grep "1h"
```

## Querying Historical Data

To query data from S3, you need to deploy Thanos Query (separate component):

### Option A: Thanos Query (Recommended)

```bash
# Deploy Thanos Query (simplified example)
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thanos-query
  namespace: observability
spec:
  replicas: 2
  selector:
    matchLabels:
      app: thanos-query
  template:
    metadata:
      labels:
        app: thanos-query
    spec:
      containers:
        - name: thanos-query
          image: quay.io/thanos/thanos:v0.34.0
          args:
            - query
            - --http-address=0.0.0.0:9090
            - --grpc-address=0.0.0.0:10901
            - --store=dnssrv+_grpc._tcp.prometheus.observability.svc.cluster.local
          ports:
            - name: http
              containerPort: 9090
            - name: grpc
              containerPort: 10901
EOF
```

### Option B: Direct Prometheus Queries

Prometheus will only query local data. For full historical queries, use Thanos Query or Grafana with Thanos data source.

## Troubleshooting

### No Data in S3

**Symptoms**: S3 bucket is empty after several hours

**Checks**:

```bash
# Check sidecar logs
kubectl logs -n observability prometheus-0 -c thanos-sidecar

# Common errors:
# - "Access Denied" → Check IAM permissions
# - "Bucket not found" → Check bucket name in objstore.yml
# - "No blocks to upload" → Wait for 2h block to be created
```

**Solutions**:

```bash
# Verify secret exists
kubectl get secret thanos-objstore-config -n observability -o yaml

# Test S3 access from pod
kubectl exec -n observability prometheus-0 -c thanos-sidecar -- \
  wget -O- --spider https://s3.us-east-1.amazonaws.com/prometheus-long-term-storage

# Force block creation (for testing)
curl -X POST http://localhost:9090/api/v1/admin/tsdb/snapshot
```

### High S3 Costs

**Symptoms**: S3 costs higher than expected

**Analysis**:

```bash
# Check total storage
aws s3 ls s3://prometheus-long-term-storage --recursive \
  --human-readable --summarize

# Check number of requests (S3 charges per request)
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name AllRequests \
  --dimensions Name=BucketName,Value=prometheus-long-term-storage \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Sum
```

**Solutions**:

1. **Enable lifecycle policies** to transition to Glacier
2. **Reduce scrape frequency** (15s → 30s) to reduce cardinality
3. **Use compaction** to reduce number of objects
4. **Enable intelligent tiering** for automatic cost optimization

### Upload Failures

**Symptoms**: Sidecar logs show upload errors

**Common Issues**:

1. **Network timeout**:
   ```yaml
   # Add to objstore.yml
   http_config:
     idle_conn_timeout: 90s
     response_header_timeout: 2m
   ```

2. **Rate limiting**:
   ```bash
   # Check for 503 errors in logs
   kubectl logs -n observability prometheus-0 -c thanos-sidecar | grep 503

   # Solution: Add exponential backoff (already configured in Thanos)
   ```

3. **Block corruption**:
   ```bash
   # Verify block integrity
   kubectl exec -n observability prometheus-0 -c thanos-sidecar -- \
     thanos tools bucket verify \
     --objstore.config-file=/etc/thanos/objstore.yml
   ```

## Cost Optimization

### Storage Tiers

| Tier | Use Case | Cost/GB/month |
|------|----------|---------------|
| Standard | Recent data (0-30 days) | $0.023 |
| Standard-IA | Frequent access (30-90 days) | $0.0125 |
| Glacier Instant | Infrequent access (90-365 days) | $0.004 |
| Glacier Deep | Archive (1+ years) | $0.00099 |

### Lifecycle Policy Example

```json
{
  "Rules": [
    {
      "Id": "OptimizeStorage",
      "Status": "Enabled",
      "Transitions": [
        {"Days": 30, "StorageClass": "STANDARD_IA"},
        {"Days": 90, "StorageClass": "GLACIER_IR"},
        {"Days": 365, "StorageClass": "DEEP_ARCHIVE"}
      ]
    }
  ]
}
```

### Downsampling Savings

| Resolution | Storage Reduction | Query Performance |
|------------|-------------------|-------------------|
| Raw (15s) | Baseline | Baseline |
| 5m | ~20x smaller | 20x faster for 1mo range |
| 1h | ~240x smaller | 240x faster for 1yr range |

## Monitoring

### Metrics to Watch

```promql
# Upload rate
rate(thanos_objstore_bucket_operations_total{operation="upload"}[5m])

# Upload failures
rate(thanos_objstore_bucket_operation_failures_total{operation="upload"}[5m])

# Block upload lag (should be < 2h)
time() - thanos_objstore_bucket_last_successful_upload_time

# Storage usage in S3
thanos_objstore_bucket_objects
```

### Alerts

```yaml
groups:
  - name: thanos
    rules:
      - alert: ThanosUploadFailing
        expr: rate(thanos_objstore_bucket_operation_failures_total{operation="upload"}[5m]) > 0
        for: 15m
        annotations:
          summary: "Thanos failing to upload blocks to S3"

      - alert: ThanosUploadLag
        expr: (time() - thanos_objstore_bucket_last_successful_upload_time) > 7200
        for: 15m
        annotations:
          summary: "Thanos hasn't uploaded blocks in >2h"
```

## References

- [Thanos Documentation](https://thanos.io/tip/thanos/quick-tutorial.md/)
- [S3 Configuration](https://thanos.io/tip/thanos/storage.md/#s3)
- [Downsampling Guide](https://thanos.io/tip/components/compact.md/#downsampling)
- [Cost Optimization](https://aws.amazon.com/s3/pricing/)
