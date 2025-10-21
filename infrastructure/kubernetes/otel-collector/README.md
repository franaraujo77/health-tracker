# OpenTelemetry Collector Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the OpenTelemetry Collector in a production-ready configuration.

## Architecture

- **3 Replicas**: High availability with load distribution
- **Anti-Affinity**: Pods spread across different nodes
- **Resource Limits**: 500m-2CPU, 512Mi-2Gi memory per pod
- **Health Checks**: Liveness and readiness probes on port 13133
- **Auto-scaling Ready**: HPA can be added for dynamic scaling

## Components

### Manifests

1. **namespace.yaml** - Creates `observability` namespace
2. **serviceaccount.yaml** - RBAC for Kubernetes resource discovery
3. **configmap.yaml** - OpenTelemetry Collector configuration
4. **deployment.yaml** - 3-replica deployment with anti-affinity
5. **service.yaml** - ClusterIP and headless services
6. **kustomization.yaml** - Kustomize configuration for easy deployment

### Services

- **otel-collector** (ClusterIP): Load-balanced access to collector
  - `otlp-grpc`: 4317 (OTLP gRPC endpoint)
  - `otlp-http`: 4318 (OTLP HTTP endpoint)
  - `prometheus`: 8889 (Prometheus exporter)
  - `metrics`: 8888 (Collector self-monitoring)
  - `health`: 13133 (Health check endpoint)
  - `zpages`: 55679 (Debugging zpages)

- **otel-collector-headless**: Direct pod access for service mesh

## Deployment

### Prerequisites

- Kubernetes cluster 1.24+
- kubectl configured
- kustomize (or kubectl with kustomize support)

### Deploy with Kustomize

```bash
# Deploy to cluster
kubectl apply -k infrastructure/kubernetes/otel-collector/

# Verify deployment
kubectl get pods -n observability
kubectl get svc -n observability
```

### Deploy with kubectl

```bash
# Apply manifests in order
kubectl apply -f infrastructure/kubernetes/otel-collector/namespace.yaml
kubectl apply -f infrastructure/kubernetes/otel-collector/serviceaccount.yaml
kubectl apply -f infrastructure/kubernetes/otel-collector/configmap.yaml
kubectl apply -f infrastructure/kubernetes/otel-collector/deployment.yaml
kubectl apply -f infrastructure/kubernetes/otel-collector/service.yaml
```

### Dry-Run Validation

```bash
# Validate manifests without applying
kubectl apply -k infrastructure/kubernetes/otel-collector/ --dry-run=client

# Server-side validation
kubectl apply -k infrastructure/kubernetes/otel-collector/ --dry-run=server
```

## Configuration

### Update Configuration

The collector configuration is stored in the ConfigMap. To update:

```bash
# Edit the configmap
kubectl edit configmap otel-collector-config -n observability

# Or apply updated configmap.yaml
kubectl apply -f infrastructure/kubernetes/otel-collector/configmap.yaml

# Rollout restart to apply changes
kubectl rollout restart deployment/otel-collector -n observability
```

### Scale Replicas

```bash
# Scale to 5 replicas
kubectl scale deployment/otel-collector -n observability --replicas=5

# Or update deployment.yaml and reapply
```

## Monitoring

### Check Pod Status

```bash
# View pods
kubectl get pods -n observability -l app=otel-collector

# View pod logs
kubectl logs -n observability -l app=otel-collector --tail=100 -f

# Describe pod for events
kubectl describe pod -n observability <pod-name>
```

### Health Checks

```bash
# Port-forward to health endpoint
kubectl port-forward -n observability svc/otel-collector 13133:13133

# Check health
curl http://localhost:13133/health/status
```

### Metrics

```bash
# Port-forward to metrics endpoint
kubectl port-forward -n observability svc/otel-collector 8888:8888

# View collector metrics
curl http://localhost:8888/metrics
```

### Debugging with zpages

```bash
# Port-forward to zpages
kubectl port-forward -n observability svc/otel-collector 55679:55679

# Open in browser
open http://localhost:55679/debug/servicez
```

## Troubleshooting

### Pods Not Starting

```bash
# Check events
kubectl get events -n observability --sort-by='.lastTimestamp'

# Check pod describe
kubectl describe pod -n observability <pod-name>

# Common issues:
# - Image not available: Build and push image first
# - Resource constraints: Check node resources
# - ConfigMap missing: Apply configmap.yaml first
```

### Configuration Errors

```bash
# Check collector logs
kubectl logs -n observability <pod-name>

# Validate config syntax
# (Use validation script from Docker image)
```

### Network Issues

```bash
# Test service connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n observability -- sh

# From debug pod:
curl http://otel-collector:13133/health/status
curl http://otel-collector:4318/v1/traces
```

## Resource Requirements

### Per Pod

- **CPU Request**: 500m (0.5 cores)
- **CPU Limit**: 2 cores
- **Memory Request**: 512Mi
- **Memory Limit**: 2Gi

### Cluster Total (3 replicas)

- **CPU**: 1.5-6 cores
- **Memory**: 1.5-6Gi

## Security

- **Non-root**: Runs as user 65534 (nobody)
- **RBAC**: Minimal permissions for Kubernetes API
- **Network Policies**: Can be added for traffic control
- **Pod Security Standards**: Compatible with restricted PSS

## Next Steps

1. Configure HPA (Horizontal Pod Autoscaler) - Task 7
2. Add TLS certificates - Task 4
3. Configure exporters for backends - Task 5
4. Set up monitoring dashboards - Task 9

## References

- [OpenTelemetry Collector Documentation](https://opentelemetry.io/docs/collector/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [Kustomize Documentation](https://kustomize.io/)
