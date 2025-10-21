# Grafana Dashboards

This directory contains Grafana dashboard definitions for monitoring the Health Tracker observability infrastructure.

## OpenTelemetry Collector Dashboard

**File**: `otel-collector-dashboard.json`

### Overview

Comprehensive monitoring dashboard for OpenTelemetry Collector instances, providing real-time visibility into:

- Data ingestion rates
- Export success/failure metrics
- Queue sizes and backpressure
- Resource utilization
- Processing latencies
- Data loss indicators

### Panels

#### 1. Data Ingestion Rate by Receiver
- **Metrics**: Spans, metrics, and logs accepted per second
- **Breakdown**: Per receiver (OTLP gRPC, OTLP HTTP, Prometheus)
- **Use Case**: Monitor incoming telemetry volume, detect traffic spikes

#### 2. Export Success/Failure Rates
- **Metrics**: Sent vs failed spans/metrics/logs per exporter
- **Breakdown**: Per exporter (Prometheus, Tempo, Loki)
- **Use Case**: Identify export issues, track data loss
- **Alert**: High failure rates indicate downstream system issues

#### 3. Exporter Queue Size
- **Metrics**: Current queue depth per exporter
- **Thresholds**:
  - Green: < 500 items
  - Yellow: 500-800 items
  - Red: > 800 items
- **Use Case**: Detect backpressure before data loss occurs
- **Alert**: Queue > 800 indicates exporter cannot keep up

#### 4. Dropped Data Rate
- **Metrics**: Spans, metrics, and logs dropped per second
- **Breakdown**: Per processor (batch, memory_limiter)
- **Use Case**: Identify data loss points in pipeline
- **Alert**: Any non-zero value requires investigation

#### 5. Resource Utilization
- **Metrics**: CPU and memory usage per pod
- **Display**: Percentage of limits
- **Use Case**: Capacity planning, identify resource constraints
- **Alert**: > 85% utilization triggers HPA scaling

#### 6. Cluster Memory Utilization
- **Metrics**: Aggregate memory usage across all collector pods
- **Display**: Gauge showing % of total limits
- **Thresholds**:
  - Green: < 70%
  - Yellow: 70-85%
  - Red: > 85%
- **Use Case**: Overall cluster health at a glance

#### 7. Processing Latency (P95/P99)
- **Metrics**: 95th and 99th percentile processing time
- **Breakdown**: Per processor
- **Use Case**: Detect processing bottlenecks
- **SLO**: P99 < 100ms for real-time telemetry

#### 8. Collector Pod Status
- **Metrics**: Up/down status per pod
- **Display**: Time series showing pod availability
- **Use Case**: Track pod restarts, outages
- **Alert**: < 2 pods available (breaks high availability)

### Installation

#### Method 1: Grafana UI Import

1. Open Grafana web interface
2. Navigate to **Dashboards** → **Import**
3. Click **Upload JSON file**
4. Select `otel-collector-dashboard.json`
5. Choose Prometheus datasource
6. Click **Import**

#### Method 2: ConfigMap Deployment (Kubernetes)

```bash
# Create configmap from dashboard JSON
kubectl create configmap grafana-dashboard-otel-collector \
  --from-file=otel-collector-dashboard.json \
  -n observability

# Add label for Grafana sidecar discovery
kubectl label configmap grafana-dashboard-otel-collector \
  grafana_dashboard=1 \
  -n observability
```

If using Grafana Helm chart with sidecar enabled, the dashboard will be automatically loaded.

#### Method 3: Provisioning (Local Development)

1. Copy dashboard to Grafana provisioning directory:
   ```bash
   cp otel-collector-dashboard.json /etc/grafana/provisioning/dashboards/
   ```

2. Create provisioning config `/etc/grafana/provisioning/dashboards/dashboards.yaml`:
   ```yaml
   apiVersion: 1
   providers:
     - name: 'Health Tracker'
       folder: 'Observability'
       type: file
       disableDeletion: false
       updateIntervalSeconds: 10
       options:
         path: /etc/grafana/provisioning/dashboards
   ```

3. Restart Grafana

### Prerequisites

#### Required Metrics

The dashboard expects the following metrics from OpenTelemetry Collector:

**Receiver Metrics:**
- `otelcol_receiver_accepted_spans`
- `otelcol_receiver_accepted_metric_points`
- `otelcol_receiver_accepted_log_records`

**Exporter Metrics:**
- `otelcol_exporter_sent_spans`
- `otelcol_exporter_send_failed_spans`
- `otelcol_exporter_queue_size`

**Processor Metrics:**
- `otelcol_processor_dropped_spans`
- `otelcol_processor_dropped_metric_points`
- `otelcol_processor_dropped_log_records`
- `otelcol_processor_batch_batch_send_size_bucket`

**Infrastructure Metrics (from kube-state-metrics and cAdvisor):**
- `container_cpu_usage_seconds_total`
- `container_memory_working_set_bytes`
- `kube_pod_container_resource_limits`
- `up`

#### Prometheus Configuration

Ensure Prometheus is scraping OTel Collector metrics:

```yaml
scrape_configs:
  - job_name: 'otel-collector'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - observability
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        regex: otel-collector
        action: keep
      - source_labels: [__meta_kubernetes_pod_container_port_name]
        regex: metrics
        action: keep
```

### Usage Tips

#### Investigating Data Loss

1. Check **Dropped Data Rate** panel - identify which processor is dropping data
2. Look at **Exporter Queue Size** - if queues are full, exporters can't keep up
3. Review **Export Failure Rates** - downstream systems may be unavailable
4. Examine **Resource Utilization** - memory limiter may be triggering due to insufficient resources

#### Capacity Planning

1. Monitor **Data Ingestion Rate** trends over 7-30 days
2. Check **Resource Utilization** during peak hours
3. Use **Processing Latency P99** to validate performance under load
4. Plan for 2x headroom on current peak traffic

#### Performance Tuning

- **High latency + low CPU**: Increase batch processor `send_batch_size`
- **High memory + dropping data**: Increase memory limits or add pods
- **Queue buildup**: Tune exporter `sending_queue.num_consumers`
- **Export failures**: Check downstream system capacity

### Alerting

Recommended Prometheus alerts based on dashboard metrics:

```yaml
groups:
  - name: otel-collector
    rules:
      - alert: OTelCollectorHighDropRate
        expr: rate(otelcol_processor_dropped_spans[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High data drop rate detected"

      - alert: OTelCollectorQueueFull
        expr: otelcol_exporter_queue_size > 800
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Exporter queue near capacity"

      - alert: OTelCollectorExportFailing
        expr: rate(otelcol_exporter_send_failed_spans[5m]) > rate(otelcol_exporter_sent_spans[5m]) * 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Export failure rate >10%"

      - alert: OTelCollectorHighMemory
        expr: 100 * (container_memory_working_set_bytes{pod=~"otel-collector.*"} / kube_pod_container_resource_limits{resource="memory",pod=~"otel-collector.*"}) > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Collector memory usage >90%"

      - alert: OTelCollectorPodDown
        expr: sum(up{job="otel-collector"}) < 2
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Less than 2 collector pods available"
```

### Customization

#### Adding Custom Panels

1. Edit the dashboard in Grafana UI
2. Add your panel
3. Save dashboard
4. Export JSON: **Dashboard settings** → **JSON Model** → Copy
5. Replace `otel-collector-dashboard.json` content
6. Commit to version control

#### Variables

The dashboard uses a `DS_PROMETHEUS` variable for datasource selection. To add more variables:

1. Add to `templating.list` in JSON
2. Reference in queries using `${VARIABLE_NAME}` syntax

### Troubleshooting

#### Dashboard Shows "No Data"

1. **Check Prometheus datasource**: Verify it's configured and reachable
2. **Verify collector is running**: `kubectl get pods -n observability -l app=otel-collector`
3. **Check metrics endpoint**: `kubectl port-forward -n observability svc/otel-collector 8888:8888`, then `curl http://localhost:8888/metrics`
4. **Verify Prometheus scraping**: Check Prometheus targets page

#### Metrics Missing

- **Receiver metrics**: Ensure telemetry is being sent to collector
- **Exporter metrics**: Check exporter configuration in collector config
- **Infrastructure metrics**: Install kube-state-metrics and node-exporter

#### High Cardinality Warning

If Prometheus shows high cardinality warnings:

1. Reduce label dimensions in collector config
2. Use `metric_relabel_configs` in Prometheus to drop unnecessary labels
3. Aggregate metrics at collector level before export

### References

- [OpenTelemetry Collector Metrics](https://opentelemetry.io/docs/collector/internal-telemetry/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)
- [Prometheus Query Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)
