# Jaeger Distributed Tracing

This directory contains documentation for Jaeger distributed tracing integration in the Health Tracker application.

## What is Distributed Tracing?

Distributed tracing tracks requests as they flow through multiple services, providing visibility into:

- **Request flow**: End-to-end path of a request across services
- **Performance bottlenecks**: Identify slow operations and dependencies
- **Error propagation**: Track how errors spread through the system
- **Service dependencies**: Understand relationships between services

## Jaeger Architecture

### Components

- **Jaeger All-in-One**: Combined collector, query, and UI (development setup)
- **OTLP Collector**: Receives traces via OpenTelemetry Protocol
- **Storage**: In-memory (development) or persistent (production)
- **UI**: Web interface for trace visualization

### Integration with Spring Boot

```
Spring Boot Application
         ↓
Micrometer Tracing (auto-instrumentation)
         ↓
OpenTelemetry Bridge
         ↓
OTLP Exporter
         ↓
Jaeger Collector (port 4318)
         ↓
Jaeger UI (port 16686)
```

## Configuration

### Spring Boot Configuration

**File**: `backend/src/main/resources/application.yml`

```yaml
management:
  tracing:
    sampling:
      probability: ${TRACING_SAMPLE_RATE:0.1} # 10% sampling
  otlp:
    tracing:
      endpoint: ${JAEGER_ENDPOINT:http://jaeger:4318/v1/traces}
```

### Sampling Strategy

- **Development**: 100% sampling (`TRACING_SAMPLE_RATE=1.0`)
- **Production**: 10% sampling (default) to reduce overhead
- **High traffic**: 1% sampling (`TRACING_SAMPLE_RATE=0.01`)

### Environment Variables

```bash
# Adjust sampling rate
TRACING_SAMPLE_RATE=1.0

# Custom Jaeger endpoint
JAEGER_ENDPOINT=http://jaeger:4318/v1/traces
```

## Accessing Jaeger UI

### Start Jaeger

```bash
# Start Jaeger and backend
docker-compose up -d jaeger backend

# Check Jaeger is running
docker-compose ps jaeger
```

### Open Jaeger UI

1. **URL**: http://localhost:16686
2. **Service**: Select `health-tracker-backend` from the dropdown
3. **Operations**: Choose specific endpoints or "All"
4. **Find Traces**: Click "Find Traces"

### Jaeger UI Features

1. **Search Traces**:
   - Filter by service, operation, tags
   - Time range selection
   - Min/max duration filters

2. **Trace Timeline**:
   - Visualize request flow
   - Span durations
   - Service dependencies

3. **Trace Details**:
   - HTTP method, URL, status code
   - Database queries
   - Error messages and stack traces
   - Custom tags and logs

## Understanding Traces

### Trace Structure

```
Trace (Request ID)
├── Span: HTTP GET /api/users
│   ├── Span: UserService.getAllUsers
│   │   ├── Span: UserRepository.findAll
│   │   │   └── Span: PostgreSQL SELECT
│   │   └── Span: Redis GET users:*
│   └── Span: HTTP Response
```

### Key Concepts

- **Trace**: Complete journey of a request
- **Span**: Individual operation within a trace
- **Parent-Child**: Spans have hierarchical relationships
- **Tags**: Key-value metadata (http.method, db.statement)
- **Logs**: Timestamped events within a span

## Auto-Instrumented Components

Spring Boot with Micrometer Tracing automatically traces:

### HTTP Requests

- All REST API endpoints
- Request/response headers
- HTTP status codes
- Response times

### Database Operations

- JPA/Hibernate queries
- Connection pool operations
- Query execution time
- SQL statements (configurable)

### External HTTP Calls

- RestTemplate requests
- WebClient calls
- Response times

### Async Operations

- @Async method calls
- CompletableFuture operations

## Custom Instrumentation

### Adding Custom Spans

```java
import io.micrometer.tracing.Tracer;
import io.micrometer.tracing.Span;

@Service
public class HealthMetricsService {

    private final Tracer tracer;

    public HealthMetricsService(Tracer tracer) {
        this.tracer = tracer;
    }

    public void processMetrics(Long userId) {
        Span span = tracer.nextSpan().name("process-health-metrics").start();
        try (Tracer.SpanInScope ws = tracer.withSpan(span)) {
            // Add custom tags
            span.tag("user.id", userId.toString());
            span.tag("operation", "process");

            // Your business logic
            performProcessing();

            // Add events/logs
            span.event("processing.complete");
        } catch (Exception e) {
            span.error(e);
            throw e;
        } finally {
            span.end();
        }
    }
}
```

### Adding Tags

```java
// In controller or service
@GetMapping("/api/health-metrics/{id}")
public HealthMetric getMetric(@PathVariable Long id) {
    Span currentSpan = tracer.currentSpan();
    if (currentSpan != null) {
        currentSpan.tag("metric.id", id.toString());
        currentSpan.tag("metric.type", "blood-pressure");
    }
    return service.getMetric(id);
}
```

## Common Trace Queries

### Find Slow Requests

1. Set min duration: `100ms` or `500ms`
2. Sort by duration (longest first)
3. Analyze spans to find bottlenecks

### Find Errors

1. Add tag filter: `error=true`
2. Or search by HTTP status: `http.status_code=500`
3. View error details in span logs

### Analyze Specific User

1. Add tag filter: `user.id=123`
2. View all operations for that user
3. Identify patterns or issues

### Database Performance

1. Filter operations: `SELECT`, `INSERT`, `UPDATE`
2. Find slow database queries
3. Check connection pool metrics

## Integration with Other Tools

### Correlation with Logs

Traces include correlation IDs that appear in logs:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "message": "User login successful",
  "traceId": "a1b2c3d4e5f6",
  "spanId": "f6e5d4c3b2a1",
  "userId": "123"
}
```

Search logs in Kibana using `traceId` to see related log entries.

### Metrics in Grafana

Link from Grafana dashboards to Jaeger:

- Click on metric spike
- Copy timestamp
- Search traces in Jaeger for that time range

### Prometheus Alerts

When Prometheus alerts fire, check Jaeger for:

- Recent error traces
- Performance degradation patterns
- Service dependency issues

## Troubleshooting

### Traces Not Appearing

1. **Check backend is sending traces**:

   ```bash
   docker-compose logs backend | grep -i "trace\|otlp"
   ```

2. **Verify Jaeger is healthy**:

   ```bash
   curl http://localhost:16686/
   ```

3. **Check OTLP endpoint is accessible**:

   ```bash
   docker exec health-tracker-backend curl -v http://jaeger:4318/v1/traces
   ```

4. **Increase sampling rate** (for testing):
   ```bash
   TRACING_SAMPLE_RATE=1.0 docker-compose up -d backend
   ```

### Missing Spans

- Check if the component is auto-instrumented
- Verify dependencies are loaded correctly
- Review custom span implementation

### High Memory Usage

Jaeger all-in-one uses in-memory storage:

1. **Monitor memory**:

   ```bash
   docker stats health-tracker-jaeger
   ```

2. **Reduce trace retention** (if needed):
   - Default: Keep all traces in memory
   - Production: Use persistent storage (Elasticsearch, Cassandra)

### Performance Impact

Tracing has minimal overhead (~1-5%):

- Use appropriate sampling rates
- Avoid excessive custom spans
- Don't log large payloads in spans

## Production Considerations

### Persistent Storage

Replace in-memory storage with Elasticsearch:

```yaml
jaeger:
  environment:
    - SPAN_STORAGE_TYPE=elasticsearch
    - ES_SERVER_URLS=http://elasticsearch:9200
```

### Sampling Strategy

Implement adaptive sampling:

- 100% for errors
- Higher rate for critical endpoints
- Lower rate for health checks

### Security

1. **Authentication**: Enable Jaeger OAuth/OIDC
2. **Network**: Restrict access to internal network only
3. **Data Privacy**: Avoid tracing PHI in span tags

### High Availability

1. **Collector**: Deploy multiple collector instances
2. **Load Balancer**: Distribute trace ingestion
3. **Storage**: Use clustered Elasticsearch

### Data Retention

Configure trace retention based on volume:

```yaml
# Elasticsearch retention
- ES_INDEX_RETENTION_DAYS=7 # Keep traces for 7 days
```

## Key Metrics to Monitor

### Trace Volume

- Traces per second
- Spans per trace (complexity)
- Trace size (bytes)

### Performance

- 95th/99th percentile latencies
- Slowest operations
- Error rates by service

### Dependencies

- Service call patterns
- External API latencies
- Database query times

## Example Scenarios

### Scenario 1: Debug Slow API Response

1. User reports slow `/api/health-metrics` endpoint
2. Search Jaeger for operation: `GET /api/health-metrics`
3. Sort by duration, find slowest trace
4. Analyze spans:
   - Controller: 2ms
   - Service: 5ms
   - Repository: 1200ms ← Bottleneck!
   - PostgreSQL query: 1195ms
5. Identify slow query, add database index

### Scenario 2: Track User Journey

1. User ID: 123 reports data loss
2. Search traces with tag: `user.id=123`
3. View all operations in timeline
4. Identify missing `POST /api/health-metrics` call
5. Check if request was blocked or failed

### Scenario 3: Analyze Error Cascade

1. Multiple 500 errors in logs
2. Search traces with `error=true`
3. View trace timeline:
   - Database connection timeout
   - Retry attempts
   - Circuit breaker opens
   - Cascading failures
4. Root cause: Database connection pool exhaustion

## Resources

- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Micrometer Tracing](https://micrometer.io/docs/tracing)
- [Spring Boot Observability](https://spring.io/blog/2022/10/12/observability-with-spring-boot-3)

## Best Practices

1. **Use meaningful span names**: Describe the operation clearly
2. **Add relevant tags**: Include IDs, types, status codes
3. **Avoid PII in tags**: Don't trace sensitive user data
4. **Set appropriate sampling**: Balance visibility and overhead
5. **Correlate with logs**: Use trace/span IDs in log messages
6. **Monitor trace quality**: Ensure spans are complete and accurate
7. **Review regularly**: Analyze traces to identify optimization opportunities
