# Distributed Tracing Implementation Guide

## Overview

This guide shows how to implement distributed tracing in GitHub Actions workflows using OpenTelemetry and Tempo.

## Instrumentation Guidelines

### 1. Span Naming Conventions

**Good names** (action-oriented, hierarchical):
```
workflow.frontend-ci
  job.build
    step.npm-install
    step.npm-build
  job.test
    step.run-unit-tests
```

**Bad names**:
- Too generic: `process`, `execute`, `run`
- Too specific: `npm_install_node_modules_from_package_json`

### 2. Context Propagation

Always propagate W3C Trace Context headers:
```bash
# Extract trace context from environment
TRACEPARENT="${TRACEPARENT:-00-$(openssl rand -hex 16)-$(openssl rand -hex 8)-01}"

# Pass to child processes
export TRACEPARENT

# Include in HTTP requests
curl -H "traceparent: $TRACEPARENT" https://api.example.com
```

### 3. Span Attributes

**Required attributes**:
- `service.name`: Service generating the span
- `service.version`: Version of the service
- `deployment.environment`: Environment (prod/staging/dev)

**Recommended attributes**:
- `workflow.name`: GitHub Actions workflow name
- `job.name`: Job name
- `step.name`: Step name
- `git.commit.sha`: Commit SHA
- `git.branch`: Branch name
- `pr.number`: Pull request number (if applicable)

**Example**:
```json
{
  "service.name": "frontend-ci",
  "service.version": "1.0.0",
  "workflow.name": "Frontend CI",
  "job.name": "build",
  "step.name": "npm-build",
  "git.commit.sha": "a1b2c3d4",
  "git.branch": "main"
}
```

### 4. Sampling Configuration

**Tail-based sampling** (configured in Tempo):
- **Always sample**: HTTP 5xx errors, requests >5s, critical workflows
- **Probabilistic**: 10% of other traces
- **Adjustable**: Via `sampling-config.yaml`

**Head-based sampling** (in application):
```javascript
// Sample 10% at the source
const shouldSample = Math.random() < 0.1;
```

## Best Practices

### 1. Keep Spans Focused
- One span = one logical operation
- Span duration should be meaningful (not nanoseconds, not hours)
- Nest child spans for sub-operations

### 2. Add Events for Key Moments
```javascript
span.addEvent('cache.hit', { key: 'user:123' });
span.addEvent('retry.attempt', { attempt: 2, max: 3 });
span.addEvent('fallback.triggered', { reason: 'timeout' });
```

### 3. Record Exceptions
```javascript
try {
  riskyOperation();
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR });
  throw error;
}
```

### 4. Use Semantic Conventions
Follow [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/):
- `http.method`, `http.status_code`, `http.url`
- `db.system`, `db.statement`, `db.name`
- `messaging.system`, `messaging.destination`

## Troubleshooting

### Traces Not Appearing
1. Check OTLP endpoint is reachable
2. Verify trace ID format (32-character hex)
3. Check sampling decision
4. Review Tempo logs for errors

### Missing Spans
1. Ensure context propagation
2. Check for unhandled exceptions closing spans early
3. Verify span limits not exceeded

### Slow Queries
1. Use trace ID for direct lookups (fastest)
2. Add indexed tags for common searches
3. Limit time range for tag-based searches

## Examples

### GitHub Actions Workflow
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup OpenTelemetry
        run: |
          export OTEL_EXPORTER_OTLP_ENDPOINT="http://tempo:4318"
          export OTEL_SERVICE_NAME="frontend-ci"

      - name: Build
        run: |
          otel-cli exec \
            --name "npm-build" \
            --attrs "workflow=frontend-ci,job=build" \
            npm run build
```

### TraceQL Queries
```traceql
# Find slow frontend builds
{ service.name="frontend-ci" && duration > 5m }

# Find errors in specific workflow
{ workflow.name="backend-ci" && status=error }

# Find traces by PR number
{ pr.number=123 }
```

## References

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [TraceQL Language](https://grafana.com/docs/tempo/latest/traceql/)
