# Log-to-Trace Correlation Guide

This guide explains how to correlate logs in Loki with traces in Tempo using trace IDs, enabling seamless navigation between logs and traces in Grafana.

## Overview

Log-to-trace correlation allows you to:
- Click on a trace ID in logs to jump to the corresponding trace in Tempo
- See related logs when viewing a trace
- Investigate incidents faster by correlating structured logs with distributed traces

## Architecture

```
┌─────────────────┐
│  Application    │
│  - Generates    │
│    trace_id     │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────┐   ┌─────────────┐
│    Logs     │   │   Traces    │
│  (with      │   │  (with      │
│   trace_id) │   │   trace_id) │
└──────┬──────┘   └──────┬──────┘
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│    Loki     │   │    Tempo    │
└──────┬──────┘   └──────┬──────┘
       │                 │
       └────────┬────────┘
                │
                ▼
         ┌────────────┐
         │  Grafana   │
         │  - Derived │
         │    fields  │
         └────────────┘
```

## Implementation

### 1. Ensure Trace IDs in Logs

Your application logs must include the trace ID as a field:

**JSON Format (Recommended):**
```json
{
  "timestamp": "2024-01-20T10:30:45.123Z",
  "level": "info",
  "message": "Processing request",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "service": "frontend",
  "workflow": "frontend-ci"
}
```

**Text Format with Extraction:**
```
2024-01-20T10:30:45.123Z INFO Processing request [trace_id=4bf92f3577b34da6a3ce929d0e0e4736]
```

### 2. Configure Loki to Extract Trace IDs

The trace ID should be extracted as a label or indexed field in Loki.

**Option A: As a Label (if low cardinality)**
```yaml
# In loki-config.yaml pipeline stages
- json:
    expressions:
      trace_id: trace_id
- labels:
    trace_id:
```

**Option B: As an Indexed Field (preferred for high cardinality)**
```yaml
# In loki-config.yaml
- json:
    expressions:
      trace_id: trace_id
# trace_id will be searchable in log body
```

### 3. Configure Grafana Derived Fields

Create derived fields in the Loki data source configuration to enable click-through from logs to traces.

**In Grafana UI:**
1. Go to **Configuration > Data Sources**
2. Select your **Loki** data source
3. Scroll to **Derived fields**
4. Add a new derived field:

| Field | Value |
|-------|-------|
| **Name** | TraceID |
| **Regex** | `trace_id[=:](\w+)` or `"trace_id":"(\w+)"` |
| **Query** | `$${__value.raw}` |
| **URL** | (leave empty to use data source UID) |
| **URL Label** | View Trace |
| **Data source** | Tempo |
| **Internal link** | ✓ (checked) |

**As Code (for provisioning):**
```yaml
apiVersion: 1
datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki.observability.svc.cluster.local:3100
    jsonData:
      maxLines: 1000
      derivedFields:
        - datasourceUid: tempo  # UID of your Tempo datasource
          matcherRegex: "trace_id[=:]?(\\w+)"
          name: TraceID
          url: "$${__value.raw}"
          urlDisplayLabel: "View Trace"
```

### 4. Configure Tempo to Show Related Logs

Enable log correlation in the Tempo data source:

**In Grafana UI:**
1. Go to **Configuration > Data Sources**
2. Select your **Tempo** data source
3. Scroll to **Trace to logs**
4. Configure:

| Field | Value |
|-------|-------|
| **Data source** | Loki |
| **Tags** | `service.name` |
| **Map tag names** | ✓ (if attribute names differ) |
| **Span start shift** | `-5m` (show logs 5 min before span) |
| **Span end shift** | `5m` (show logs 5 min after span) |
| **Filter by Trace ID** | `{job="$${__tags}"} |="$${__trace.traceId}"` |
| **Filter by Span ID** | (optional) `{job="$${__tags}"} |="$${__span.spanId}"` |

**As Code:**
```yaml
apiVersion: 1
datasources:
  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo.observability.svc.cluster.local:3200
    jsonData:
      tracesToLogs:
        datasourceUid: loki
        tags: ['service.name', 'job']
        mappedTags:
          - key: service.name
            value: job
        spanStartTimeShift: '-5m'
        spanEndTimeShift: '5m'
        filterByTraceID: true
        filterBySpanID: false
        lokiSearch: true
```

## Usage

### From Logs to Traces

1. **Query logs in Grafana Explore:**
   ```logql
   {job="github-actions"} |= "error"
   ```

2. **Find a log entry with a trace ID**

3. **Click the "View Trace" link** next to the trace ID

4. **Grafana will open the trace in Tempo**, showing the full distributed trace

### From Traces to Logs

1. **Open a trace in Tempo** (via Explore or dashboard)

2. **Click on any span** in the trace timeline

3. **In the span details panel, click "Logs for this span"**

4. **Grafana will show related logs** from Loki filtered by:
   - Trace ID
   - Service name
   - Time range around the span

## Query Examples

### Find Logs with Specific Trace ID
```logql
{job="github-actions"} | json | trace_id="4bf92f3577b34da6a3ce929d0e0e4736"
```

### Find All Logs for Traces with Errors
```logql
{job="github-actions"} | json | level="error" | trace_id != ""
```

### Count Logs by Trace ID
```logql
count by (trace_id) (
  {job="github-actions"} | json | trace_id != ""
)
```

## Troubleshooting

### Trace ID link doesn't appear
- **Check regex**: Ensure the derived field regex matches your log format
- **Test in Explore**: Use "Stats" to see extracted fields
- **Verify field name**: Ensure logs contain `trace_id` field

### Clicking trace ID does nothing
- **Check Tempo datasource UID**: Ensure it matches in derived field config
- **Verify Tempo is accessible**: Test Tempo data source connection
- **Check trace ID format**: Must be valid hex string (32 or 16 characters)

### No logs shown from trace
- **Check time range**: Logs may be outside span time range
- **Verify tags**: Ensure service.name tag matches between Tempo and Loki
- **Test query manually**: Try the FilterByTraceID query in Loki Explore

### Trace IDs not being generated
- **Add OpenTelemetry SDK**: Ensure your application uses OTel SDK
- **Propagate context**: Use W3C Trace Context format
- **Inject into logs**: Configure log library to include trace context

## Best Practices

1. **Use W3C Trace Context Format**: Ensures compatibility across tools
   - Trace ID: 32 hex characters (128-bit)
   - Span ID: 16 hex characters (64-bit)

2. **Include Trace ID in Structured Logs**: Use JSON format for easy extraction

3. **Add Service Name**: Helps correlate logs and traces by service

4. **Include Span ID**: Enables more precise log-to-span correlation

5. **Set Appropriate Time Shifts**: Balance between showing relevant logs and performance

6. **Limit Log Volume**: Use sampling for high-traffic services

7. **Test Correlation**: Validate with a test trace and logs before production

## Example: Complete Log Entry

```json
{
  "timestamp": "2024-01-20T10:30:45.123Z",
  "level": "error",
  "message": "Failed to process payment",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "parent_span_id": "a3ce929d0e0e4736",
  "service.name": "payment-service",
  "service.version": "1.2.3",
  "error": "Insufficient funds",
  "user_id": "user-123",
  "transaction_id": "txn-456"
}
```

## Grafana Dashboard Example

```json
{
  "panels": [
    {
      "title": "Error Logs with Traces",
      "type": "logs",
      "targets": [
        {
          "expr": "{job=\"github-actions\"} | json | level=\"error\" | trace_id != \"\"",
          "refId": "A"
        }
      ],
      "options": {
        "showTime": true,
        "showLabels": true,
        "wrapLogMessage": false,
        "enableLogDetails": true
      }
    }
  ]
}
```

## References

- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Logging](https://opentelemetry.io/docs/reference/specification/logs/)
- [Grafana Derived Fields](https://grafana.com/docs/grafana/latest/datasources/loki/#derived-fields)
- [Tempo Trace to Logs](https://grafana.com/docs/grafana/latest/datasources/tempo/#trace-to-logs)
