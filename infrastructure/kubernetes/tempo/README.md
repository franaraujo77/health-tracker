# Tempo Kubernetes Deployment

Grafana Tempo deployment for distributed tracing in the Health Tracker observability stack.

## Overview

- **Deployment**: StatefulSet (single-binary mode)
- **Storage**: AWS S3
- **Retention**: 7 days
- **Sampling**: 10% probabilistic + always sample errors/slow
- **Namespace**: observability

## Deployment

```bash
# Validate manifests
kubectl kustomize infrastructure/kubernetes/tempo/base

# Deploy
kubectl apply -k infrastructure/kubernetes/tempo/base

# Verify
kubectl get pods -n observability -l app=tempo
```

## Configuration

### S3 Credentials
```bash
kubectl create secret generic tempo-s3-credentials \
  --from-literal=access-key-id=YOUR_KEY \
  --from-literal=secret-access-key=YOUR_SECRET \
  -n observability
```

### Grafana Integration
See `docs/grafana-integration.md`

## Endpoints

- **OTLP gRPC**: `tempo.observability.svc.cluster.local:4317`
- **OTLP HTTP**: `tempo.observability.svc.cluster.local:4318`
- **Query API**: `http://tempo.observability.svc.cluster.local:3200`

## Service Graph

Tempo generates service graphs from traces and exports metrics to Prometheus.

## References

- [Tempo Documentation](https://grafana.com/docs/tempo/latest/)
- [Distributed Tracing Guide](docs/tracing-guide.md)
