# Prometheus Kubernetes Deployment

This directory contains Kubernetes manifests for deploying Prometheus with persistent storage for the Health Tracker observability stack.

## Architecture

- **StatefulSet**: 2 replicas with anti-affinity for high availability
- **Persistent Storage**: 500GB per replica for 90-day metric retention
- **Configuration**: Scrapes from OTel Collector, Kubernetes components, and node metrics
- **Recording Rules**: Pre-aggregated metrics for dashboard performance
- **RBAC**: Service discovery permissions for Kubernetes resources

## Components

### Deployment Files

- `statefulset.yaml` - StatefulSet with persistent storage and resource limits
- `service.yaml` - Headless service for StatefulSet + external service for UI
- `serviceaccount.yaml` - RBAC permissions for Kubernetes service discovery
- `configmap.yaml` - Prometheus configuration and recording rules
- `pdb.yaml` - PodDisruptionBudget for high availability
- `kustomization.yaml` - Kustomize configuration for deployment

### Resource Allocation

**Per Pod**:
- CPU: 2 cores (request), 4 cores (limit)
- Memory: 4Gi (request), 8Gi (limit)
- Storage: 500GB persistent volume

**Total Cluster Resources** (2 replicas):
- CPU: 4-8 cores
- Memory: 8-16Gi
- Storage: 1TB

## Prerequisites

1. **Kubernetes Cluster**: v1.24+
2. **Storage Class**: Dynamic provisioning for 500GB PVCs
3. **Namespace**: `observability` namespace must exist
4. **Docker Image**: Custom Prometheus image must be built and accessible
5. **Dependencies**: OTel Collector should be deployed first

## Deployment

### 1. Build Custom Prometheus Image

```bash
cd infrastructure/docker/prometheus
docker build -t health-tracker/prometheus:2.48.0 .

# If using a registry, tag and push
docker tag health-tracker/prometheus:2.48.0 <registry>/health-tracker/prometheus:2.48.0
docker push <registry>/health-tracker/prometheus:2.48.0

# Update image reference in statefulset.yaml if using registry
```

### 2. Create Namespace

```bash
kubectl create namespace observability
```

### 3. Deploy Prometheus

```bash
# Apply all manifests
kubectl apply -k infrastructure/kubernetes/prometheus/

# Or apply individually
kubectl apply -f infrastructure/kubernetes/prometheus/serviceaccount.yaml
kubectl apply -f infrastructure/kubernetes/prometheus/configmap.yaml
kubectl apply -f infrastructure/kubernetes/prometheus/service.yaml
kubectl apply -f infrastructure/kubernetes/prometheus/statefulset.yaml
kubectl apply -f infrastructure/kubernetes/prometheus/pdb.yaml
```

### 4. Verify Deployment

```bash
# Check pods are running
kubectl get pods -n observability -l app=prometheus

# Expected output:
# NAME            READY   STATUS    RESTARTS   AGE
# prometheus-0    2/2     Running   0          2m
# prometheus-1    2/2     Running   0          2m

# Check PVCs are bound
kubectl get pvc -n observability -l app=prometheus

# Check pod distribution across nodes
kubectl get pods -n observability -l app=prometheus -o wide

# Check service endpoints
kubectl get svc -n observability -l app=prometheus
```

### 5. Access Prometheus UI

```bash
# Port forward to access UI
kubectl port-forward -n observability svc/prometheus-external 9090:9090

# Open browser to http://localhost:9090
```

## Configuration

### Scrape Targets

Prometheus is configured to scrape metrics from:

1. **OpenTelemetry Collector** - OTLP metrics on port 8888
2. **Kubernetes API Server** - Cluster metrics
3. **Kubernetes Nodes** - Node metrics via kubelet
4. **Kubernetes Pods** - Pods with `prometheus.io/scrape: "true"` annotation
5. **kube-state-metrics** - Kubernetes object state metrics
6. **node-exporter** - Node hardware and OS metrics
7. **cAdvisor** - Container metrics

### Recording Rules

Pre-aggregated metrics for performance:

- **OTel Collector**: Ingestion rates, drop rates, export success
- **Kubernetes**: Pod/namespace CPU and memory utilization
- **Nodes**: CPU, memory, and disk utilization
- **Applications**: Request rates, error rates, latency percentiles
- **CI/CD**: Build duration and success rates

### Storage Retention

- **Retention Period**: 90 days
- **Block Duration**: 2 hours (optimized for compaction)
- **Storage Per Replica**: 500GB
- **Estimated Capacity**: ~10M active time series

## Operations

### Scaling

#### Vertical Scaling (Increase Resources)

```bash
# Edit statefulset.yaml to increase resources
# Example: 4 CPU → 8 CPU, 8Gi → 16Gi memory

kubectl apply -f infrastructure/kubernetes/prometheus/statefulset.yaml

# Restart pods to apply new resources
kubectl rollout restart statefulset prometheus -n observability
```

#### Horizontal Scaling (Add Replicas)

```bash
# Scale to 3 replicas
kubectl scale statefulset prometheus -n observability --replicas=3

# Update PDB minAvailable
kubectl edit pdb prometheus -n observability
# Set minAvailable: 2
```

### Configuration Reload

Configuration changes are automatically reloaded by the config-reloader sidecar:

```bash
# Update ConfigMap
kubectl apply -f infrastructure/kubernetes/prometheus/configmap.yaml

# Config reloader will detect changes and send /-/reload to Prometheus
# Check logs to verify reload
kubectl logs -n observability prometheus-0 -c config-reloader
```

### Manual Reload

```bash
# If automatic reload fails, manually trigger reload
kubectl exec -n observability prometheus-0 -c prometheus -- \
  wget --post-data='' http://localhost:9090/-/reload
```

### Backup and Restore

#### Create Snapshot

```bash
# Create snapshot via API
kubectl exec -n observability prometheus-0 -c prometheus -- \
  wget --post-data='' http://localhost:9090/api/v1/admin/tsdb/snapshot

# Snapshot is created in /prometheus/snapshots/<snapshot-name>
```

#### Backup to S3

```bash
# Run backup script (configured in Docker image)
kubectl exec -n observability prometheus-0 -c prometheus -- \
  /usr/local/bin/backup-prometheus.sh
```

#### Restore from Snapshot

```bash
# 1. Scale down to 0 replicas
kubectl scale statefulset prometheus -n observability --replicas=0

# 2. Copy snapshot data to PVC
kubectl cp <snapshot-dir> observability/prometheus-0:/prometheus/

# 3. Scale back up
kubectl scale statefulset prometheus -n observability --replicas=2
```

### Monitoring Prometheus

#### Health Checks

```bash
# Check health endpoint
kubectl exec -n observability prometheus-0 -c prometheus -- \
  wget -q -O- http://localhost:9090/-/healthy

# Check readiness endpoint
kubectl exec -n observability prometheus-0 -c prometheus -- \
  wget -q -O- http://localhost:9090/-/ready
```

#### Query Performance

```bash
# Check query statistics
kubectl exec -n observability prometheus-0 -c prometheus -- \
  wget -q -O- http://localhost:9090/api/v1/status/tsdb

# Check TSDB statistics
kubectl exec -n observability prometheus-0 -c prometheus -- \
  wget -q -O- http://localhost:9090/api/v1/status/tsdb
```

#### Storage Usage

```bash
# Check PVC usage
kubectl exec -n observability prometheus-0 -- df -h /prometheus

# Check Prometheus TSDB size
kubectl exec -n observability prometheus-0 -- du -sh /prometheus
```

## Troubleshooting

### Pods Not Starting

**Symptoms**: Pods stuck in Pending or CrashLoopBackOff

**Checks**:

```bash
# Check pod events
kubectl describe pod -n observability prometheus-0

# Common issues:
# - PVC not bound → Check storage class availability
# - Image pull error → Verify image exists and is accessible
# - Resource constraints → Check node resources
```

**Solutions**:

```bash
# If PVC not bound, check storage class
kubectl get storageclass
kubectl describe pvc -n observability prometheus-storage-prometheus-0

# If no default storage class, set one
kubectl patch storageclass <class-name> -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

### High Memory Usage

**Symptoms**: Prometheus pods being OOMKilled

**Checks**:

```bash
# Check current memory usage
kubectl top pod -n observability -l app=prometheus

# Check time series count
curl http://localhost:9090/api/v1/query?query=prometheus_tsdb_symbol_table_size_bytes
```

**Solutions**:

```bash
# 1. Increase memory limits
kubectl edit statefulset prometheus -n observability
# Update memory limit from 8Gi to 16Gi

# 2. Reduce retention period
kubectl edit statefulset prometheus -n observability
# Change --storage.tsdb.retention.time=90d to 60d

# 3. Reduce scrape frequency
kubectl edit configmap prometheus-config -n observability
# Change scrape_interval from 15s to 30s
```

### Configuration Errors

**Symptoms**: Prometheus fails to start after config change

**Checks**:

```bash
# View Prometheus logs
kubectl logs -n observability prometheus-0 -c prometheus

# Validate configuration
kubectl exec -n observability prometheus-0 -c prometheus -- \
  promtool check config /etc/prometheus/prometheus.yml
```

**Solutions**:

```bash
# Rollback to previous ConfigMap version
kubectl rollout undo statefulset prometheus -n observability

# Or restore from backup
kubectl apply -f infrastructure/kubernetes/prometheus/configmap.yaml.backup
kubectl delete pod -n observability prometheus-0 prometheus-1
```

### Slow Queries

**Symptoms**: Grafana dashboards loading slowly

**Checks**:

```bash
# Check query performance in Prometheus UI
# Navigate to Status → TSDB Status
# Look for high cardinality metrics

# Check recording rules are working
curl http://localhost:9090/api/v1/query?query=otel:collector:ingestion_rate:5m
```

**Solutions**:

1. Use recording rules (already configured in configmap.yaml)
2. Reduce query time range
3. Add more specific label filters to queries
4. Increase Prometheus resources

## Capacity Planning

### Current Configuration

- **2 replicas** × 500GB = 1TB total storage
- **90-day retention** with 2h block duration
- **Estimated capacity**: ~10M active time series

### Growth Projections

| Time Series | Storage Needed | Action |
|-------------|----------------|--------|
| 10M | 500GB/replica | Current config |
| 20M | 1TB/replica | Increase PVC size |
| 50M | 2TB/replica | Consider remote storage |
| 100M+ | N/A | Implement Thanos or Cortex |

### Calculating Storage Requirements

```bash
# Formula: storage = retention_days * samples_per_day * bytes_per_sample * time_series
# Example: 90 days * (86400/15) samples/day * 2 bytes * 10M series
#        = 90 * 5760 * 2 * 10000000
#        = 1.036TB per replica
```

## Security

### RBAC Permissions

Prometheus ServiceAccount has read-only access to:
- Nodes and node metrics
- Services and endpoints
- Pods and pod metrics
- ConfigMaps (for configuration)
- Ingresses (for service discovery)

### Network Policies

Apply network policies to restrict access:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: prometheus
  namespace: observability
spec:
  podSelector:
    matchLabels:
      app: prometheus
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: observability
      ports:
        - protocol: TCP
          port: 9090
  egress:
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 443  # Kubernetes API
        - protocol: TCP
          port: 8888  # OTel Collector metrics
```

### Pod Security Standards

Prometheus pods enforce security best practices:
- Run as non-root user (UID 65534)
- Read-only root filesystem
- Drop all capabilities
- No privilege escalation

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Prometheus Kubernetes Operator](https://github.com/prometheus-operator/prometheus-operator)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Recording Rules Guide](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
