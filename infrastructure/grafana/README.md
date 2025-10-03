# Grafana Dashboards

This directory contains Grafana dashboards and provisioning configuration for the Health Tracker application.

## Contents

- **provisioning/datasources/**: Data source configuration (Prometheus)
- **provisioning/dashboards/**: Dashboard auto-provisioning configuration
- **dashboards/**: Pre-built dashboard JSON files

## Dashboards Overview

### 1. Application Health Dashboard

**File**: `dashboards/1-application-health.json`
**UID**: `health-tracker-app-health`
**Refresh**: 10 seconds

**Panels**:

- Backend Service Status (gauge)
- CPU Usage (system & process)
- JVM Memory Usage (heap & non-heap)
- HTTP Request Rate by Status
- API Response Time Percentiles (p50, p95, p99)
- Database Connection Pool
- GC Pause Time

**Use Cases**:

- Monitor application health and availability
- Track JVM performance and memory usage
- Identify slow API endpoints
- Monitor database connection pool utilization

### 2. Business Metrics Dashboard

**File**: `dashboards/2-business-metrics.json`
**UID**: `health-tracker-business`
**Refresh**: 30 seconds

**Panels**:

- New User Registrations (24h)
- Successful Logins (24h)
- Health Metrics Created (24h)
- Goals Created (24h)
- User Registration Trend
- Health Data Entry Rate
- Most Popular API Endpoints
- API Success vs Error Rates

**Use Cases**:

- Track user growth and engagement
- Monitor health data entry patterns
- Identify popular features
- Measure overall system success rate

### 3. Security Monitoring Dashboard

**File**: `dashboards/3-security-monitoring.json`
**UID**: `health-tracker-security`
**Refresh**: 30 seconds

**Panels**:

- Failed Login Attempts (1h)
- Unauthorized Access Attempts (1h)
- Overall Error Rate
- Security Service Status
- Security Incidents Rate
- Authentication Activity
- Error Rate by Endpoint
- Error Distribution by Status Code
- PHI/Sensitive Data Access Patterns

**Use Cases**:

- Detect potential security breaches
- Monitor failed authentication attempts
- Track unauthorized access patterns
- Audit sensitive data access
- Identify suspicious activity

### 4. Infrastructure Dashboard

**File**: `dashboards/4-infrastructure.json`
**UID**: `health-tracker-infrastructure`
**Refresh**: 10 seconds

**Panels**:

- Backend Service Status
- PostgreSQL Database Status
- JVM Heap Used
- DB Pool Utilization
- JVM Heap Memory (used/committed/max)
- JVM Threads
- Database Connection Pool Details
- Database Connection Performance
- JVM Class Loading
- GC Collections Rate

**Use Cases**:

- Monitor infrastructure health
- Track resource utilization
- Identify performance bottlenecks
- Monitor database performance
- Detect resource exhaustion

## Accessing Grafana

### Local Development

1. Start the stack:

   ```bash
   docker-compose up -d grafana
   ```

2. Access Grafana UI:

   ```
   http://localhost:3001
   ```

3. Default credentials:
   - **Username**: `admin`
   - **Password**: `admin` (change on first login)

4. Dashboards are automatically provisioned and available in the home screen

### Configuration

Grafana is configured via:

- **Environment Variables**: Set in `docker-compose.yml`
- **Provisioning**: Auto-configured via YAML files in `provisioning/`
- **Dashboards**: Auto-loaded from `dashboards/` directory

## Customizing Dashboards

### Option 1: Edit in Grafana UI

1. Open dashboard in Grafana
2. Click "Dashboard settings" (gear icon)
3. Make changes
4. Click "Save dashboard"
5. Export JSON via "Share" → "Export" → "Save to file"
6. Replace the JSON file in `dashboards/` directory
7. Restart Grafana: `docker-compose restart grafana`

### Option 2: Edit JSON Directly

1. Edit the JSON file in `dashboards/` directory
2. Restart Grafana: `docker-compose restart grafana`
3. Changes will be reflected immediately

## Creating New Dashboards

### Method 1: Create in UI, Export

1. Create dashboard in Grafana UI
2. Export JSON: Dashboard settings → JSON Model → Copy to clipboard
3. Save to `dashboards/X-dashboard-name.json`
4. Dashboard will be auto-loaded on next Grafana restart

### Method 2: Use Dashboard Templates

Use existing dashboards as templates:

```bash
# Copy an existing dashboard
cp dashboards/1-application-health.json dashboards/5-my-dashboard.json

# Edit the following fields:
# - "title": "My Custom Dashboard"
# - "uid": "health-tracker-my-custom"
# - panels: Modify as needed
```

## Dashboard Variables

All dashboards support the following time ranges:

- Last 5 minutes
- Last 15 minutes
- Last 30 minutes
- Last 1 hour
- Last 3 hours
- Last 6 hours
- Last 12 hours
- Last 24 hours
- Last 7 days

Auto-refresh intervals: 10s, 30s, 1m, 5m, 15m, 30m, 1h

## Alert Configuration

Alerts can be configured directly in Grafana:

1. Open a dashboard panel
2. Click panel title → Edit
3. Go to "Alert" tab
4. Click "Create alert rule from this panel"
5. Configure alert conditions and notifications

Example alert conditions:

- CPU usage > 80% for 10 minutes
- Error rate > 5% for 5 minutes
- Database connections > 90% for 5 minutes
- Failed login attempts > 10 per minute

## Prometheus Data Source

Prometheus is automatically configured as the default data source:

- **Name**: Prometheus
- **URL**: `http://prometheus:9090`
- **Access**: Server (proxy)
- **Scrape interval**: 15s

## Troubleshooting

### Dashboards Not Loading

1. Check Grafana logs:

   ```bash
   docker-compose logs grafana
   ```

2. Verify provisioning configuration:

   ```bash
   docker exec health-tracker-grafana cat /etc/grafana/provisioning/dashboards/default.yml
   ```

3. Check dashboard files are mounted:
   ```bash
   docker exec health-tracker-grafana ls /var/lib/grafana/dashboards
   ```

### No Data in Panels

1. Verify Prometheus is scraping metrics:

   ```bash
   curl http://localhost:9090/api/v1/targets
   ```

2. Check data source connectivity:
   - Go to Configuration → Data Sources → Prometheus
   - Click "Test" button

3. Verify metrics exist in Prometheus:
   ```bash
   curl http://localhost:9090/api/v1/label/__name__/values
   ```

### Panels Show "No Data"

1. Check time range (top right corner)
2. Verify Prometheus has data for the selected time range
3. Test query in Prometheus UI: http://localhost:9090/graph
4. Check panel query in Edit mode

### Permission Denied Errors

1. Check volume permissions:

   ```bash
   docker exec health-tracker-grafana ls -la /var/lib/grafana
   ```

2. Fix permissions if needed:
   ```bash
   docker-compose down
   docker volume rm health-tracker-grafana-data
   docker-compose up -d grafana
   ```

## Production Considerations

For production deployments:

1. **Authentication**: Configure OAuth or LDAP

   ```yaml
   environment:
     - GF_AUTH_LDAP_ENABLED=true
     - GF_AUTH_LDAP_CONFIG_FILE=/etc/grafana/ldap.toml
   ```

2. **HTTPS**: Enable TLS

   ```yaml
   environment:
     - GF_SERVER_PROTOCOL=https
     - GF_SERVER_CERT_FILE=/etc/grafana/grafana.crt
     - GF_SERVER_CERT_KEY=/etc/grafana/grafana.key
   ```

3. **External Database**: Use PostgreSQL/MySQL for Grafana data

   ```yaml
   environment:
     - GF_DATABASE_TYPE=postgres
     - GF_DATABASE_HOST=postgres:5432
     - GF_DATABASE_NAME=grafana
   ```

4. **High Availability**: Deploy multiple Grafana instances behind a load balancer

5. **Backup**: Regularly backup Grafana database and dashboards

   ```bash
   docker exec health-tracker-grafana grafana-cli admin export
   ```

6. **Alerting**: Configure notification channels (Slack, PagerDuty, email)

7. **Anonymous Access**: Disable for production
   ```yaml
   environment:
     - GF_AUTH_ANONYMOUS_ENABLED=false
   ```

## Resources

- [Grafana Documentation](https://grafana.com/docs/)
- [Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/best-practices-for-creating-dashboards/)
- [Provisioning Documentation](https://grafana.com/docs/grafana/latest/administration/provisioning/)
- [Prometheus Data Source](https://grafana.com/docs/grafana/latest/datasources/prometheus/)
- [PromQL Queries](https://prometheus.io/docs/prometheus/latest/querying/basics/)
