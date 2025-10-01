# Prometheus Configuration

This directory contains Prometheus configuration for the Health Tracker application.

## Contents

- **prometheus.yml**: Main Prometheus configuration file
- **rules/application_alerts.yml**: Alert rules for application monitoring

## Configuration Overview

### Scrape Targets

1. **Backend Service** (Job: `backend`)
   - Endpoint: `http://backend:8080/actuator/prometheus`
   - Interval: 15 seconds
   - Metrics: Spring Boot Actuator metrics (JVM, HTTP, database, etc.)

2. **Prometheus Self-Monitoring** (Job: `prometheus`)
   - Endpoint: `http://localhost:9090`
   - Metrics: Prometheus internal metrics

### Data Retention

- **Retention Period**: 30 days
- **Storage Path**: `/prometheus` (Docker volume)
- **Data is persisted** across container restarts

### Alert Rules

The following alert rules are configured (see `rules/application_alerts.yml`):

#### Application Alerts

1. **HighErrorRate**: Triggers when >5% of requests return 5xx errors for 5+ minutes
2. **HighCPUUsage**: Triggers when CPU usage >80% for 10+ minutes
3. **HighMemoryUsage**: Triggers when JVM heap usage >85% for 5+ minutes
4. **DatabaseConnectionPoolExhaustion**: Triggers when >90% of DB connections are in use
5. **ApplicationDown**: Triggers when backend is unreachable for 2+ minutes
6. **SlowAPIResponse**: Triggers when p95 response time >2 seconds for 5+ minutes
7. **HighFailedLoginRate**: Triggers when >5 failed logins/second for 5+ minutes (security)
8. **HighGCTime**: Triggers when average GC pause time >0.5 seconds

#### Database Alerts

1. **DatabaseHealthCheckFailed**: Triggers when database health check fails for 2+ minutes
2. **SlowDatabaseQueries**: Triggers when average query time >1 second for 5+ minutes

## Accessing Prometheus

### Local Development

1. Start the stack:

   ```bash
   docker-compose up -d prometheus
   ```

2. Access Prometheus UI:

   ```
   http://localhost:9090
   ```

3. Verify targets are being scraped:

   ```
   http://localhost:9090/targets
   ```

4. View configured alert rules:
   ```
   http://localhost:9090/alerts
   ```

### Querying Metrics

Example PromQL queries:

```promql
# HTTP request rate
rate(http_server_requests_seconds_count[5m])

# JVM memory usage
jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"}

# Database connection pool
hikaricp_connections_active / hikaricp_connections_max

# API response time (p95)
histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m]))

# Error rate by endpoint
rate(http_server_requests_seconds_count{status=~"5.."}[5m])
```

## Adding New Scrape Targets

To add a new service to scrape:

1. Edit `prometheus.yml`
2. Add a new job under `scrape_configs`:

```yaml
- job_name: 'my-service'
  metrics_path: '/metrics'
  static_configs:
    - targets: ['my-service:port']
      labels:
        service: 'my-service-name'
```

3. Reload Prometheus configuration:
   ```bash
   docker-compose restart prometheus
   ```

## Adding New Alert Rules

1. Edit `rules/application_alerts.yml` or create a new rules file
2. Add your alert rule:

```yaml
- alert: MyNewAlert
  expr: my_metric > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: 'Alert summary'
    description: 'Alert description with {{ $value }}'
```

3. Reload Prometheus:
   ```bash
   docker-compose restart prometheus
   ```

## Troubleshooting

### Targets Not Being Scraped

1. Check target health: http://localhost:9090/targets
2. Verify service is running: `docker-compose ps`
3. Check network connectivity: `docker exec health-tracker-prometheus wget -O- http://backend:8080/actuator/prometheus`
4. Check Prometheus logs: `docker-compose logs prometheus`

### Metrics Not Appearing

1. Verify Micrometer dependency in backend `pom.xml`:

   ```xml
   <dependency>
     <groupId>io.micrometer</groupId>
     <artifactId>micrometer-registry-prometheus</artifactId>
   </dependency>
   ```

2. Check Actuator configuration in `application.yml`:

   ```yaml
   management:
     endpoints:
       web:
         exposure:
           include: health,metrics,prometheus
   ```

3. Test metrics endpoint directly:
   ```bash
   curl http://localhost:8080/actuator/prometheus
   ```

### Alert Rules Not Working

1. Check rule syntax: http://localhost:9090/rules
2. View alert status: http://localhost:9090/alerts
3. Check Prometheus logs for rule evaluation errors:
   ```bash
   docker-compose logs prometheus | grep "error"
   ```

## Integration with Grafana

Prometheus is automatically configured as a data source in Grafana. See the Grafana documentation for creating dashboards.

## Production Considerations

For production deployments:

1. **External Storage**: Use remote storage (e.g., Thanos, Cortex) for long-term retention
2. **High Availability**: Deploy multiple Prometheus instances with federation
3. **Alertmanager**: Configure Alertmanager for alert routing and notifications
4. **Authentication**: Enable basic auth or OAuth for Prometheus UI
5. **TLS**: Configure TLS for secure communication
6. **Resource Limits**: Set appropriate memory and CPU limits
7. **Backup**: Regularly backup Prometheus data directory

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Spring Boot Actuator Metrics](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html#actuator.metrics)
- [Micrometer Documentation](https://micrometer.io/docs)
