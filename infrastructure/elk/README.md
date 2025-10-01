# ELK Stack (Elasticsearch, Logstash, Kibana)

This directory contains the ELK Stack configuration for centralized logging in the Health Tracker application.

## Components

### Elasticsearch

- **Version**: 8.11.3
- **Purpose**: Store and index application logs
- **Port**: 9200 (HTTP API), 9300 (Node communication)
- **Storage**: Persistent volume for log data
- **Memory**: 512MB heap size

### Logstash

- **Version**: 8.11.3
- **Purpose**: Process logs, mask PHI, and forward to Elasticsearch
- **Ports**:
  - 5000 (TCP input from application)
  - 5044 (Beats input)
  - 9600 (Monitoring API)
- **Memory**: 256MB heap size

### Kibana

- **Version**: 8.11.3
- **Purpose**: Visualize and search logs
- **Port**: 5601 (Web UI)

## Log Retention Policy

As per HIPAA compliance requirements:

- **Application Logs**: 90 days
- **Audit Logs**: 7 years (2555 days)
- **Security Logs**: 90 days

Retention is managed via Elasticsearch ILM (Index Lifecycle Management) policy.

## PHI Data Masking

Logstash automatically masks the following Protected Health Information:

- **Email addresses**: `user@example.com` → `***EMAIL***`
- **SSN**: `123-45-6789` → `***SSN***`
- **Phone numbers**: `555-123-4567` → `***PHONE***`
- **Credit cards**: `1234-5678-9012-3456` → `***CARD***`
- **Date of birth**: `01/15/1990` → `***DOB***`
- **Medical record numbers**: `MRN-1234567` → `***MRN***`
- **IP addresses**: `192.168.1.1` → `***IP***`

Sensitive fields are also removed:

- `password`, `token`, `secret`, `api_key`

## Index Strategy

Logs are indexed by type for better organization:

- `healthtracker-application-YYYY.MM.dd`: General application logs
- `healthtracker-audit-YYYY.MM.dd`: Audit trail logs
- `healthtracker-security-YYYY.MM.dd`: Security-related logs
- `healthtracker-error-YYYY.MM.dd`: Error and fatal logs

## Accessing the ELK Stack

### Start the Stack

```bash
# Start all ELK services
docker-compose up -d elasticsearch logstash kibana

# Check status
docker-compose ps elasticsearch logstash kibana
```

### Access Kibana

1. Open browser: http://localhost:5601
2. First-time setup will create default index patterns
3. Go to "Discover" to view logs

### Search Logs

Example Kibana queries:

```
# All error logs
level:ERROR

# Logs from specific logger
logger_name:"com.healthtracker.backend.service.UserService"

# Security incidents
log_type:security

# Audit logs
log_type:audit

# Failed login attempts
message:"Failed login attempt"

# Logs from last hour
@timestamp:[now-1h TO now]

# Specific user activity (after anonymization)
user_id:"user-123" AND action:"health_metric_created"
```

## Kibana Dashboards

Create custom dashboards for:

1. **Application Overview**
   - Log volume by level
   - Top error messages
   - Response time distribution

2. **Security Monitoring**
   - Failed authentication attempts
   - Unauthorized access patterns
   - PHI access audit trail

3. **Error Analysis**
   - Error rate trends
   - Exception stack traces
   - Error distribution by service

4. **Audit Trail**
   - User actions timeline
   - Data modification history
   - Compliance reporting

## Configuration Files

### Logstash Pipeline

**File**: `logstash/pipeline/logstash.conf`

Defines:

- Input sources (TCP, Beats)
- Filter rules (PHI masking, field enrichment)
- Output configuration (Elasticsearch)

### ILM Policy

**File**: `elasticsearch/ilm-policy.json`

Defines index lifecycle:

- **Hot phase**: New logs, high I/O
- **Warm phase**: After 7 days, shrink and merge
- **Cold phase**: After 30 days, freeze for storage
- **Delete phase**: After 90 days, remove (365 days for audit)

### Logback Configuration

**File**: `backend/src/main/resources/logback-spring.xml`

Spring Boot logging configuration:

- Console appender (development)
- Logstash appender (production)
- Audit file appender (7-year retention)

## Troubleshooting

### Logs Not Appearing in Kibana

1. **Check Elasticsearch health**:

   ```bash
   curl http://localhost:9200/_cluster/health
   ```

2. **Verify Logstash is receiving logs**:

   ```bash
   docker-compose logs logstash | grep "Pipeline started"
   ```

3. **Check backend connection to Logstash**:

   ```bash
   docker-compose logs backend | grep "logstash"
   ```

4. **Verify index creation**:
   ```bash
   curl http://localhost:9200/_cat/indices?v
   ```

### Logstash Connection Issues

If backend can't connect to Logstash:

1. Check Logstash is running:

   ```bash
   docker-compose ps logstash
   ```

2. Test TCP port:

   ```bash
   telnet localhost 5000
   ```

3. Review Logstash logs:

   ```bash
   docker-compose logs logstash --tail=100
   ```

4. Verify configuration:
   ```bash
   docker exec health-tracker-logstash cat /usr/share/logstash/pipeline/logstash.conf
   ```

### Elasticsearch Out of Memory

If Elasticsearch crashes with OOM:

1. Increase heap size in `docker-compose.yml`:

   ```yaml
   environment:
     - 'ES_JAVA_OPTS=-Xms1g -Xmx1g'
   ```

2. Restart Elasticsearch:
   ```bash
   docker-compose restart elasticsearch
   ```

### Disk Space Issues

Monitor disk usage:

```bash
# Check Elasticsearch disk usage
curl http://localhost:9200/_cat/allocation?v

# Check index sizes
curl http://localhost:9200/_cat/indices?v&s=store.size:desc
```

Delete old indices manually:

```bash
# Delete indices older than 90 days
curl -X DELETE 'http://localhost:9200/healthtracker-*-2024.01.*'
```

### Kibana Can't Connect to Elasticsearch

1. Check Elasticsearch is healthy:

   ```bash
   curl http://localhost:9200/_cluster/health
   ```

2. Verify network connectivity:

   ```bash
   docker exec health-tracker-kibana curl http://elasticsearch:9200
   ```

3. Check Kibana logs:
   ```bash
   docker-compose logs kibana --tail=50
   ```

## Performance Tuning

### Elasticsearch

1. **Index Settings**:

   ```bash
   # Set number of replicas (0 for dev, 1+ for prod)
   curl -X PUT "http://localhost:9200/healthtracker-*/_settings" \
     -H 'Content-Type: application/json' \
     -d '{"index": {"number_of_replicas": 0}}'
   ```

2. **Refresh Interval**:
   ```bash
   # Increase refresh interval for better write performance
   curl -X PUT "http://localhost:9200/healthtracker-*/_settings" \
     -H 'Content-Type: application/json' \
     -d '{"index": {"refresh_interval": "30s"}}'
   ```

### Logstash

1. **Pipeline Workers**: Increase workers in `logstash.yml`:

   ```yaml
   pipeline.workers: 4
   pipeline.batch.size: 125
   ```

2. **Buffer Size**: Increase batch size for better throughput

### Application

1. **Async Logging**: Already configured in `logback-spring.xml`
2. **Log Level**: Adjust in production:
   ```yaml
   logging:
     level:
       root: WARN
       com.healthtracker.backend: INFO
   ```

## Production Considerations

### Security

1. **Enable X-Pack Security**:

   ```yaml
   environment:
     - xpack.security.enabled=true
     - ELASTIC_PASSWORD=your-secure-password
   ```

2. **TLS/SSL**: Configure SSL certificates for all components

3. **Authentication**: Enable Kibana authentication

4. **Network**: Restrict Elasticsearch/Kibana access to internal network

### High Availability

1. **Elasticsearch Cluster**: Deploy 3+ nodes
2. **Logstash**: Deploy multiple instances behind load balancer
3. **Kibana**: Deploy multiple instances

### Backup

1. **Snapshot Repository**:

   ```bash
   curl -X PUT "http://localhost:9200/_snapshot/my_backup" \
     -H 'Content-Type: application/json' \
     -d '{
       "type": "fs",
       "settings": {
         "location": "/mount/backups"
       }
     }'
   ```

2. **Automated Snapshots**: Use Elasticsearch snapshot lifecycle policies

### Monitoring

1. **Elasticsearch Monitoring**: Enable X-Pack monitoring
2. **Logstash Monitoring**: Use Logstash monitoring API (port 9600)
3. **Kibana Monitoring**: View in Stack Monitoring section

## Integration with Other Tools

### Grafana

Create Elasticsearch data source in Grafana to visualize log metrics alongside application metrics.

### Alerting

Configure Kibana Alerting or use Grafana alerts on log patterns:

- Error rate spikes
- Security incidents
- Failed authentication attempts

### APM Integration

Elasticsearch APM can be added for distributed tracing (alternative to Jaeger).

## Resources

- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Logstash Documentation](https://www.elastic.co/guide/en/logstash/current/index.html)
- [Kibana Documentation](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Logback Documentation](http://logback.qos.ch/documentation.html)
- [HIPAA Compliance Guidelines](https://www.hhs.gov/hipaa/index.html)
