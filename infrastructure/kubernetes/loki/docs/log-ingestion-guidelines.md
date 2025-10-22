# Log Ingestion Guidelines

## Structured Logging Format

### Required Fields
```json
{
  "timestamp": "2024-01-20T10:30:45.123Z",
  "level": "info|warn|error|debug",
  "message": "Human-readable message",
  "service.name": "service-name",
  "service.version": "1.0.0"
}
```

### Recommended Fields
```json
{
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "workflow": "workflow-name",
  "job": "job-name",
  "step": "step-name",
  "error": "error message if applicable"
}
```

## Label Naming Conventions

### Good Labels (Low Cardinality)
- `job` - Job name
- `level` - Log level (info, warn, error)
- `workflow` - Workflow name
- `environment` - Environment (prod, staging, dev)
- `service` - Service name

### Bad Labels (High Cardinality)
- ❌ `user_id` - Too many unique values
- ❌ `request_id` - Unique per request
- ❌ `timestamp` - Unique per log
- ❌ `message` - Unique content

## Rate Limits

| Tenant | Ingestion Rate | Burst Size | Max Streams |
|--------|----------------|------------|-------------|
| default | 10 MB/s | 20 MB | 10,000 |
| github-actions | 50 MB/s | 100 MB | 50,000 |
| development | 5 MB/s | 10 MB | 1,000 |

## Best Practices

1. **Use JSON format** for all logs
2. **Include trace IDs** for correlation
3. **Keep labels low-cardinality** (< 100 unique values)
4. **Add timestamps** in ISO 8601 format
5. **Sanitize sensitive data** before logging
6. **Use appropriate log levels** (DEBUG < INFO < WARN < ERROR)

## Example Log Entry
```json
{
  "timestamp": "2024-01-20T10:30:45.123Z",
  "level": "error",
  "message": "Failed to build frontend",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "service.name": "github-actions",
  "workflow": "frontend-ci",
  "job": "build",
  "step": "npm-build",
  "error": "Exit code 1",
  "duration_ms": 45000
}
```

## Sending Logs

### Via OpenTelemetry Collector
```yaml
# Logs are automatically forwarded to Loki
# No additional configuration needed
```

### Direct API (for testing)
```bash
curl -H "Content-Type: application/json" \
  -H "X-Scope-OrgID: github-actions" \
  -XPOST http://loki:3100/loki/api/v1/push \
  --data-raw '{
    "streams": [{
      "stream": {"job": "test", "level": "info"},
      "values": [["'$(date +%s)000000000'", "test message"]]
    }]
  }'
```
