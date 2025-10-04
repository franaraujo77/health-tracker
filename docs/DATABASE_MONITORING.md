# Database Monitoring Guide

## Overview

This guide explains the database health monitoring infrastructure for the Health Tracker application. It covers metrics collection via HikariCP and Micrometer, visualization with Grafana, and alerting through Prometheus.

## Architecture

```
Spring Boot Application
    ├── HikariCP Connection Pool (automatic metrics)
    ├── DatabaseHealthIndicator (custom health checks)
    └── DatabaseMetrics (custom query metrics)
            ↓
    Spring Boot Actuator (/actuator/prometheus)
            ↓
    Prometheus (scrapes every 10s)
            ↓
    Grafana (visualizes + PostgreSQL Health dashboard)
```

## Metrics Available

### HikariCP Connection Pool Metrics

#### hikaricp.connections.active

**Description:** Number of connections currently in use
**Healthy Range:** 0-70% of max pool size (0-7 connections with default config)
**Warning Threshold:** > 85% (alert: HighConnectionPoolUtilization)
**Critical Threshold:** > 95% (alert: CriticalConnectionPoolUtilization)
**Action Required:** If consistently > 85%, consider increasing max pool size or scaling horizontally

#### hikaricp.connections.idle

**Description:** Number of idle connections ready for use
**Healthy Range:** 20-50% of max pool size (2-5 connections with default config)
**Action Required:** If consistently 0, pool may be undersized; if always at max, pool may be oversized

#### hikaricp.connections.max

**Description:** Maximum pool size (configured limit)
**Default Value:** 10 connections
**Tuning:** Set based on formula: `(core_count * 2) + effective_spindle_count`

#### hikaricp.connections.min

**Description:** Minimum idle connections maintained
**Default Value:** 5 connections
**Tuning:** Should be ~50% of max pool size for optimal balance

#### hikaricp.connections.pending

**Description:** Threads waiting for a connection
**Healthy Range:** 0
**Action Required:** If > 0, investigate slow queries or increase pool size immediately

#### hikaricp.connections.timeout

**Description:** Count of connection acquisition timeouts
**Healthy Range:** 0
**Alert:** ConnectionTimeouts (critical)
**Action Required:** **IMMEDIATE** investigation required - indicates pool exhaustion

#### hikaricp.connections.usage

**Description:** Connection usage time distribution
**Use Case:** Identify connection leak patterns
**Analysis:** High usage times may indicate missing connection cleanup

#### hikaricp.connections.acquire

**Description:** Time to acquire a connection from the pool
**Healthy Range:** < 10ms
**Warning Threshold:** > 100ms P95 (alert: ConnectionAcquireTimeHigh)
**Action Required:** Investigate pool contention or connection validation overhead

#### hikaricp.connections.creation

**Description:** Time to create a new database connection
**Healthy Range:** < 100ms
**Action Required:** If > 500ms, check database server performance or network latency

### Custom Health Metrics

#### database.connection.latency.ms

**Description:** Time to establish database connection (via DatabaseHealthIndicator)
**Healthy Range:** < 10ms
**Warning Threshold:** > 30ms
**Critical Threshold:** > 50ms (alert: HighConnectionLatency)
**Action Required:** Check network latency or database performance

#### database.active.connections

**Description:** Total active connections to PostgreSQL (from pg_stat_activity)
**Healthy Range:** Varies by load
**Action Required:** Monitor for connection leaks if growing unbounded

#### database.size.mb

**Description:** Current database size in megabytes
**Use Case:** Capacity planning and growth monitoring
**Action Required:** Plan for storage upgrades if growth rate accelerates

### Custom Query Metrics

#### database.queries.total

**Description:** Counter for total database queries executed
**Use Case:** Query volume monitoring
**Analysis:** Rate of change indicates application load

#### database.query.duration

**Description:** Timer for query execution time
**Tags:** `query_type` (findById, save, etc.), `entity` (User, HealthProfile, etc.)
**Healthy Range:** < 100ms P95
**Action Required:** Optimize queries exceeding thresholds

## Alert Response Guide

### HighConnectionPoolUtilization (Warning)

**Trigger:** Pool > 85% utilized for 2 minutes
**Severity:** Warning
**SLA:** Investigate within 15 minutes

**Immediate Actions:**

1. Check current application load via Grafana
2. Review slow query log in database
3. Verify no connection leaks (check database.query.duration for long-running queries)
4. Consider temporary pool size increase if load spike is expected to continue

**Root Cause Analysis:**

- Check for N+1 query patterns in recent code changes
- Review connection closure in try-catch-finally blocks
- Analyze query patterns with `database.queries.total` rate

### CriticalConnectionPoolUtilization (Critical)

**Trigger:** Pool > 95% utilized for 1 minute
**Severity:** Critical
**SLA:** Immediate response required

**Immediate Actions:**

1. **URGENT:** Scale application horizontally if possible (add more instances)
2. Increase max pool size temporarily via environment variable restart
3. Investigate and terminate long-running queries:
   ```sql
   SELECT pid, age(clock_timestamp(), query_start), usename, query
   FROM pg_stat_activity
   WHERE state != 'idle' AND query_start < now() - interval '5 minutes'
   ORDER BY query_start;
   ```
4. Check for connection leaks in code (look for unclosed connections)

**Escalation:**

- If issue persists > 5 minutes, page on-call engineer
- Prepare for emergency database failover if needed

### ConnectionAcquireTimeHigh (Warning)

**Trigger:** P95 connection acquire time > 100ms for 5 minutes
**Severity:** Warning
**SLA:** Investigate within 30 minutes

**Immediate Actions:**

1. Check connection pool utilization
2. Review database performance metrics
3. Verify connection validation query performance
4. Consider increasing connection timeout if temporary spike

### ConnectionTimeouts (Critical)

**Trigger:** Any timeout in 5 minute window
**Severity:** Critical
**SLA:** **IMMEDIATE** investigation required

**Immediate Actions:**

1. **URGENT:** Check for database locks:
   ```sql
   SELECT blocked_locks.pid AS blocked_pid,
          blocking_locks.pid AS blocking_pid,
          blocked_activity.query AS blocked_statement
   FROM pg_locks blocked_locks
   JOIN pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
   JOIN pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
   WHERE NOT blocked_locks.granted;
   ```
2. Review application logs for errors
3. Consider emergency pool size increase
4. Check database CPU and memory usage

**Escalation:**

- Immediately notify database administrator
- Consider emergency maintenance window if persistent

### DatabaseHealthDown (Critical)

**Trigger:** Backend health endpoint unavailable for 1 minute
**Severity:** Critical
**SLA:** **IMMEDIATE** response required

**Immediate Actions:**

1. Check if backend application is running
2. Verify database connectivity
3. Review database server status
4. Check network connectivity between application and database

### HighConnectionLatency (Warning)

**Trigger:** Connection latency > 50ms for 3 minutes
**Severity:** Warning
**SLA:** Investigate within 30 minutes

**Immediate Actions:**

1. Check network latency between application and database
2. Verify database server load
3. Review recent infrastructure changes
4. Check if database is under maintenance

## Accessing Monitoring Tools

### Local Development

- **Grafana:** http://localhost:3001
  - Credentials: `admin` / `admin` (default)
  - Dashboard: PostgreSQL Health - Health Tracker

- **Prometheus:** http://localhost:9090
  - Targets: http://localhost:9090/targets
  - Alerts: http://localhost:9090/alerts

- **Spring Boot Actuator:**
  - Metrics: http://localhost:8080/actuator/metrics
  - Health: http://localhost:8080/actuator/health
  - Prometheus: http://localhost:8080/actuator/prometheus

- **Database:**
  - PostgreSQL: `localhost:5433`
  - Database: `healthtracker`
  - User: `admin`
  - Password: `secret`

### Production (Update with actual URLs)

- **Grafana:** https://grafana.your-domain.com
- **Prometheus:** https://prometheus.your-domain.com
- **Application:** https://api.your-domain.com

## Useful Prometheus Queries

### Connection Pool Analysis

```promql
# Connection pool utilization percentage
(hikaricp_connections_active{application="health-tracker"} / hikaricp_connections_max{application="health-tracker"}) * 100

# Active vs Max connections comparison
hikaricp_connections_active{application="health-tracker"}

# Idle connections
hikaricp_connections_idle{application="health-tracker"}

# Pending connection requests (should be 0)
hikaricp_connections_pending{application="health-tracker"}
```

### Performance Metrics

```promql
# P50, P95, P99 connection acquire time
histogram_quantile(0.50, rate(hikaricp_connections_acquire_seconds_bucket[5m]))
histogram_quantile(0.95, rate(hikaricp_connections_acquire_seconds_bucket[5m]))
histogram_quantile(0.99, rate(hikaricp_connections_acquire_seconds_bucket[5m]))

# Average connection acquire time
rate(hikaricp_connections_acquire_seconds_sum[5m]) / rate(hikaricp_connections_acquire_seconds_count[5m])

# Connection timeouts (5 minute rate)
increase(hikaricp_connections_timeout_total[5m])
```

### Query Metrics

```promql
# Total queries per second
rate(database_queries_total{application="health-tracker"}[1m])

# Average query duration by type
rate(database_query_duration_seconds_sum[5m]) / rate(database_query_duration_seconds_count[5m])

# Query duration P95 by entity
histogram_quantile(0.95, sum(rate(database_query_duration_seconds_bucket[5m])) by (le, entity))
```

### Health Metrics

```promql
# Connection latency
database_connection_latency_ms{application="health-tracker"}

# Database size growth rate
delta(database_size_mb{application="health-tracker"}[1h])

# Active database sessions
database_active_connections{application="health-tracker"}
```

## Troubleshooting

### Problem: High Connection Usage

**Symptoms:**

- `hikaricp.connections.active` consistently > 85%
- Alert: HighConnectionPoolUtilization firing

**Diagnosis Steps:**

1. Check for N+1 query problems:

   ```java
   // BAD: N+1 query
   users.forEach(user -> user.getHealthProfiles()); // Triggers N queries

   // GOOD: Eager fetch
   @Query("SELECT u FROM User u LEFT JOIN FETCH u.healthProfiles")
   ```

2. Review connection pool configuration:

   ```yaml
   spring.datasource.hikari.maximum-pool-size: 10 # May need increase
   ```

3. Verify connections are properly closed:

   ```java
   try (Connection conn = dataSource.getConnection()) {
       // Use connection
   } // Automatically closed
   ```

4. Check for long-running transactions:
   ```sql
   SELECT * FROM pg_stat_activity
   WHERE state = 'active' AND query_start < now() - interval '1 minute';
   ```

**Resolution:**

- Fix N+1 queries with JOIN FETCH or batch fetching
- Increase pool size if load justifies it
- Add connection leak detection: `spring.datasource.hikari.leak-detection-threshold=60000`

### Problem: Slow Connection Acquisition

**Symptoms:**

- `hikaricp.connections.acquire` > 100ms
- Alert: ConnectionAcquireTimeHigh firing

**Diagnosis Steps:**

1. Increase connection timeout:

   ```yaml
   spring.datasource.hikari.connection-timeout: 30000 # 30 seconds
   ```

2. Review database performance:
   - Check CPU and memory usage on database server
   - Review slow query log

3. Check network latency:

   ```bash
   ping <database-host>
   traceroute <database-host>
   ```

4. Verify pool size configuration matches load

**Resolution:**

- Optimize database queries
- Scale database vertically if CPU/memory constrained
- Increase pool size if acquire time correlates with high utilization

### Problem: Connection Timeouts

**Symptoms:**

- `hikaricp.connections.timeout` > 0
- Alert: ConnectionTimeouts firing
- Application errors: "Connection timeout"

**Diagnosis Steps:**

1. **URGENT:** Check for database locks (see alert response guide above)

2. Review application logs:

   ```bash
   grep -i "connection timeout" /var/log/healthtracker/application.log
   ```

3. Check database connection limit:

   ```sql
   SHOW max_connections;
   SELECT count(*) FROM pg_stat_activity;
   ```

4. Verify no connection leaks (unclosed connections)

**Resolution:**

- Kill blocking queries if found
- Increase database `max_connections` if at limit
- Emergency: Increase pool size temporarily
- Long-term: Fix connection leaks in code

### Problem: Database Health Check Failing

**Symptoms:**

- `/actuator/health` shows database DOWN
- Alert: DatabaseHealthDown firing

**Diagnosis Steps:**

1. Test database connectivity:

   ```bash
   psql -h localhost -p 5433 -U admin -d healthtracker
   ```

2. Check database server status:

   ```bash
   docker ps | grep postgres  # For Docker deployments
   systemctl status postgresql  # For systemd
   ```

3. Review database logs:

   ```bash
   docker logs health-tracker-db --tail 100
   ```

4. Verify network connectivity:
   ```bash
   telnet <database-host> 5432
   ```

**Resolution:**

- Restart database if crashed
- Fix network connectivity issues
- Check database disk space (common cause of failures)

## Configuration Reference

### HikariCP Configuration

Current configuration (`backend/src/main/resources/application.yml`):

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 30000 # 30 seconds
      idle-timeout: 600000 # 10 minutes
      max-lifetime: 1800000 # 30 minutes
      register-mbeans: true # Enable metrics
      pool-name: HikariPool-HealthTracker
```

### Recommended Pool Sizing by Environment

**Local Development:**

```yaml
maximum-pool-size: 5-10
minimum-idle: 2-5
```

**Testing/CI:**

```yaml
maximum-pool-size: 10-15
minimum-idle: 5
```

**Staging:**

```yaml
maximum-pool-size: 15-25
minimum-idle: 10
```

**Production:**

```yaml
maximum-pool-size: 20-50 # Based on load and database capacity
minimum-idle: 10-20
```

**Pool Sizing Formula:**

```
pool_size = (core_count * 2) + effective_spindle_count

Example for 4-core server with SSD:
pool_size = (4 * 2) + 1 = 9
```

### Prometheus Scrape Configuration

```yaml
scrape_configs:
  - job_name: 'health-tracker-backend'
    metrics_path: '/actuator/prometheus'
    scrape_interval: 10s
    static_configs:
      - targets: ['backend:8080']
        labels:
          application: 'health-tracker'
          component: 'backend'
          tier: 'application'
```

## Best Practices

### Development

1. **Always close connections** in try-with-resources or finally blocks
2. **Use @Transactional** appropriately - avoid long-running transactions
3. **Enable leak detection** in local development:
   ```yaml
   spring.datasource.hikari.leak-detection-threshold: 60000
   ```
4. **Monitor query count** - use DatabaseMetrics in new repository methods

### Operations

1. **Set up alerts** in Prometheus for all critical scenarios
2. **Review Grafana dashboards** daily during business hours
3. **Establish baselines** for normal pool utilization
4. **Run connection leak audits** monthly
5. **Tune pool size** based on actual load patterns, not estimates

### Performance

1. **Use connection pooling** (already configured via HikariCP)
2. **Optimize queries** identified by DatabaseMetrics
3. **Implement caching** for frequently accessed data
4. **Use batch operations** for bulk inserts/updates
5. **Monitor and optimize** N+1 query patterns

## References

- [HikariCP Documentation](https://github.com/brettwooldridge/HikariCP)
- [Micrometer Documentation](https://micrometer.io/docs)
- [Spring Boot Actuator](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [Prometheus Alerting](https://prometheus.io/docs/alerting/latest/overview/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [PostgreSQL Monitoring](https://www.postgresql.org/docs/current/monitoring-stats.html)

## Support

For questions or issues with database monitoring:

1. Check this guide first
2. Review Grafana dashboards for visual analysis
3. Check Prometheus alerts for active issues
4. Review application logs for error details
5. Contact DevOps team for infrastructure issues
6. Escalate to DBA for database-specific problems
