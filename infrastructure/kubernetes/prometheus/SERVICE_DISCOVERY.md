# Prometheus Service Discovery Guide

This guide explains the service discovery mechanisms configured for Prometheus in the Health Tracker observability stack.

## Overview

Prometheus supports multiple service discovery (SD) mechanisms to automatically find and monitor targets. Our configuration includes:

1. **Kubernetes SD** - Automatic discovery of Kubernetes resources
2. **DNS SD** - Discovery via DNS SRV records
3. **File SD** - Static configuration via files/ConfigMaps
4. **Consul SD** - (Optional) Service mesh integration

## Service Discovery Types

### 1. Kubernetes Service Discovery

Automatically discovers targets within the Kubernetes cluster.

#### Configured Jobs

| Job Name | Role | Purpose |
|----------|------|---------|
| `otel-collector` | pod | OpenTelemetry Collector metrics |
| `kubernetes-apiservers` | endpoints | Kubernetes API server metrics |
| `kubernetes-nodes` | node | Node-level metrics via kubelet |
| `kubernetes-pods` | pod | Pods with `prometheus.io/scrape: "true"` |
| `kube-state-metrics` | service | Kubernetes object state metrics |
| `node-exporter` | endpoints | Node hardware and OS metrics |
| `cadvisor` | node | Container metrics |

#### How It Works

**Pod Discovery Example**:

```yaml
# In your pod/deployment
metadata:
  annotations:
    prometheus.io/scrape: "true"    # Enable scraping
    prometheus.io/port: "8080"      # Metrics port
    prometheus.io/path: "/metrics"  # Metrics endpoint (optional, defaults to /metrics)
```

Prometheus will:
1. Discover the pod via Kubernetes API
2. Check for `prometheus.io/scrape: "true"` annotation
3. Scrape `http://<pod-ip>:<port><path>` every 15 seconds
4. Add labels: `namespace`, `pod`, plus all pod labels

**Relabeling**:

Kubernetes SD provides rich metadata that can be used for relabeling:

```promql
# Available metadata labels (examples)
__meta_kubernetes_pod_name
__meta_kubernetes_pod_namespace
__meta_kubernetes_pod_label_<labelname>
__meta_kubernetes_pod_annotation_<annotationname>
__meta_kubernetes_pod_node_name
__meta_kubernetes_pod_host_ip
__meta_kubernetes_pod_ip
```

### 2. DNS Service Discovery

Discovers targets via DNS SRV records, ideal for external services.

#### Configuration

```yaml
dns_sd_configs:
  - names:
      - '_prometheus._tcp.monitoring.example.com'
    type: 'SRV'
    refresh_interval: 30s
```

#### DNS Setup

Create SRV records for your services:

```bash
# Example SRV record format:
# _service._proto.name. TTL class SRV priority weight port target

_prometheus._tcp.monitoring.example.com. 60 IN SRV 10 10 9090 server1.example.com.
_prometheus._tcp.monitoring.example.com. 60 IN SRV 10 10 9090 server2.example.com.
_prometheus._tcp.monitoring.example.com. 60 IN SRV 20 10 9090 server3.example.com.
```

#### Testing DNS SD

```bash
# Query SRV records
dig +short SRV _prometheus._tcp.monitoring.example.com

# Expected output:
# 10 10 9090 server1.example.com.
# 10 10 9090 server2.example.com.
```

#### Use Cases

- External databases (RDS, Cloud SQL)
- Managed services with DNS endpoints
- Multi-datacenter deployments
- Services discovered via service mesh

### 3. File-Based Service Discovery

Discovers targets from JSON/YAML files, ideal for static external targets.

#### Configuration

File SD watches for changes in specified files:

```yaml
file_sd_configs:
  - files:
      - '/etc/prometheus/targets/*.json'
      - '/etc/prometheus/targets/*.yml'
    refresh_interval: 30s
```

#### File Formats

**JSON Format**:

```json
[
  {
    "targets": [
      "host1.example.com:9100",
      "host2.example.com:9100"
    ],
    "labels": {
      "job": "node-exporter",
      "environment": "production",
      "datacenter": "us-east"
    }
  }
]
```

**YAML Format**:

```yaml
- targets:
    - host1.example.com:9100
    - host2.example.com:9100
  labels:
    job: node-exporter
    environment: production
    datacenter: us-east
```

#### Adding Static Targets

**Method 1: Update ConfigMap**

```bash
# Edit the targets ConfigMap
kubectl edit configmap prometheus-targets -n observability

# Add your targets in data section
data:
  my-services.json: |
    [{
      "targets": ["service1.example.com:9090"],
      "labels": {"job": "my-service"}
    }]

# Prometheus will reload automatically (config-reloader sidecar)
```

**Method 2: Create New ConfigMap**

```bash
# Create from file
kubectl create configmap prometheus-targets \
  -n observability \
  --from-file=targets.json=my-targets.json \
  --dry-run=client -o yaml | kubectl apply -f -
```

**Method 3: Use Example Template**

```bash
# Copy and customize the example
kubectl apply -f infrastructure/kubernetes/prometheus/targets-configmap.yaml

# Edit with your actual targets
kubectl edit configmap prometheus-targets -n observability
```

#### Use Cases

- Legacy systems without service discovery
- External SaaS endpoints
- Cloud provider managed services
- Manual override for testing

### 4. Consul Service Discovery (Optional)

Discovers services registered in HashiCorp Consul.

#### Configuration

```yaml
consul_sd_configs:
  - server: 'consul.service.consul:8500'
    datacenter: 'dc1'
    services: []  # Empty = discover all services
```

#### Prerequisites

1. Consul cluster running
2. Services registered with health checks
3. Network connectivity from Prometheus pods

#### Service Registration Example

```hcl
service {
  name = "api-server"
  port = 8080
  tags = ["production", "api"]

  check {
    http     = "http://localhost:8080/health"
    interval = "10s"
  }

  meta {
    prometheus_port = "9090"
    prometheus_path = "/metrics"
  }
}
```

## Relabeling Rules

Relabeling transforms discovered targets before scraping.

### Common Patterns

#### 1. Filter by Label

```yaml
relabel_configs:
  # Only scrape pods with specific label
  - source_labels: [__meta_kubernetes_pod_label_monitoring]
    action: keep
    regex: enabled
```

#### 2. Rename Labels

```yaml
relabel_configs:
  # Copy pod name to instance label
  - source_labels: [__meta_kubernetes_pod_name]
    target_label: instance
```

#### 3. Drop Targets

```yaml
relabel_configs:
  # Skip test namespaces
  - source_labels: [__meta_kubernetes_namespace]
    action: drop
    regex: .*-test
```

#### 4. Custom Metrics Path

```yaml
relabel_configs:
  # Use annotation for custom path
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
    action: replace
    target_label: __metrics_path__
    regex: (.+)
```

#### 5. Add Static Labels

```yaml
relabel_configs:
  # Add environment label
  - target_label: environment
    replacement: production
```

## Validation

### Check Discovered Targets

```bash
# Port forward to Prometheus
kubectl port-forward -n observability svc/prometheus-external 9090:9090

# Open browser
open http://localhost:9090/targets

# Or via API
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length'
```

### Verify Specific Job

```promql
# Query targets by job
up{job="kubernetes-pods"}

# Count targets per job
count by (job) (up)

# Check for down targets
up == 0
```

### Check Service Discovery

```bash
# View SD results
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="kubernetes-pods")'

# Check dropped targets
curl http://localhost:9090/api/v1/targets | jq '.data.droppedTargets | length'
```

## Troubleshooting

### No Targets Discovered

**Kubernetes SD**:

```bash
# Check RBAC permissions
kubectl auth can-i list pods --as=system:serviceaccount:observability:prometheus

# View service account
kubectl get serviceaccount prometheus -n observability

# Check ClusterRoleBinding
kubectl get clusterrolebinding prometheus -o yaml
```

**DNS SD**:

```bash
# Test DNS resolution from Prometheus pod
kubectl exec -n observability prometheus-0 -c prometheus -- \
  nslookup _prometheus._tcp.monitoring.example.com

# Check DNS SRV records
kubectl exec -n observability prometheus-0 -c prometheus -- \
  dig +short SRV _prometheus._tcp.monitoring.example.com
```

**File SD**:

```bash
# Check if ConfigMap is mounted
kubectl exec -n observability prometheus-0 -c prometheus -- \
  ls -la /etc/prometheus/targets/

# View target files
kubectl exec -n observability prometheus-0 -c prometheus -- \
  cat /etc/prometheus/targets/databases.json
```

### Targets Discovered But Not Scraped

```bash
# Check Prometheus logs
kubectl logs -n observability prometheus-0 -c prometheus | grep -i error

# Common issues:
# - Network connectivity (test with wget/curl)
# - TLS certificate issues
# - Authentication required
# - Wrong port or path
# - Firewall rules
```

### Relabeling Not Working

```bash
# View raw discovered targets (before relabeling)
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[0].discoveredLabels'

# View final labels (after relabeling)
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[0].labels'

# Test relabeling config
# Use https://relabeling.rbp.io/ or promtool
```

## Best Practices

### 1. Use Kubernetes Annotations

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
    prometheus.io/path: "/metrics"
```

### 2. Label Consistently

```yaml
labels:
  environment: production   # Use consistent naming
  team: platform           # Add ownership
  service: api-server      # Service identifier
```

### 3. Minimize Cardinality

```yaml
# BAD: User ID in label (unbounded cardinality)
labels:
  user_id: "12345"

# GOOD: Use metric labels for high-cardinality data
http_requests_total{user_id="12345"}  # In metric, not target label
```

### 4. Use Meaningful Job Names

```yaml
# BAD
- job_name: 'job1'

# GOOD
- job_name: 'api-production-us-east'
```

### 5. Document Custom Configs

```yaml
# Always comment custom relabeling
relabel_configs:
  # Drop staging pods to reduce costs
  - source_labels: [__meta_kubernetes_pod_label_environment]
    action: drop
    regex: staging
```

## Examples

### Example 1: Monitor AWS RDS

```yaml
# DNS SD for RDS endpoints
- job_name: 'aws-rds'
  dns_sd_configs:
    - names:
        - '_mysql._tcp.rds.us-east-1.amazonaws.com'
      type: 'SRV'
  relabel_configs:
    - target_label: provider
      replacement: aws
    - target_label: service
      replacement: rds
```

### Example 2: External API Monitoring

```yaml
# File SD for external APIs
- job_name: 'external-apis'
  file_sd_configs:
    - files:
        - '/etc/prometheus/targets/external-apis.json'
  relabel_configs:
    - source_labels: [__address__]
      target_label: __param_target
    - target_label: __address__
      replacement: blackbox-exporter:9115
```

### Example 3: Multi-Cluster Monitoring

```yaml
# Federation from other Prometheus instances
- job_name: 'federated-clusters'
  honor_labels: true
  metrics_path: '/federate'
  params:
    'match[]':
      - '{job="kubernetes-pods"}'
  static_configs:
    - targets:
        - 'prometheus.us-west-1.example.com:9090'
        - 'prometheus.eu-west-1.example.com:9090'
```

## References

- [Prometheus SD Configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- [Kubernetes SD](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)
- [DNS SD](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#dns_sd_config)
- [File SD](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#file_sd_config)
- [Relabeling](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config)
