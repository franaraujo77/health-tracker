package com.healthtracker.backend.monitoring;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Duration;
import java.time.Instant;

/**
 * Custom health indicator for PostgreSQL database monitoring.
 *
 * Provides detailed health metrics including:
 * - Connection latency
 * - Active connections count
 * - Database size
 * - PostgreSQL version
 *
 * This indicator is automatically registered with Spring Boot Actuator
 * and appears in the /actuator/health endpoint.
 */
@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    private final DataSource dataSource;
    private final JdbcTemplate jdbcTemplate;

    public DatabaseHealthIndicator(DataSource dataSource, JdbcTemplate jdbcTemplate) {
        this.dataSource = dataSource;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Health health() {
        try {
            Instant start = Instant.now();

            // Test connection latency
            try (Connection connection = dataSource.getConnection()) {
                connection.isValid(5); // 5 second timeout
            }

            Duration latency = Duration.between(start, Instant.now());

            // Query database statistics
            Integer activeConnections = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'",
                Integer.class
            );

            Long databaseSize = jdbcTemplate.queryForObject(
                "SELECT pg_database_size(current_database())",
                Long.class
            );

            String postgresVersion = jdbcTemplate.queryForObject(
                "SELECT version()",
                String.class
            );

            return Health.up()
                .withDetail("database", "PostgreSQL")
                .withDetail("version", postgresVersion)
                .withDetail("connectionLatencyMs", latency.toMillis())
                .withDetail("activeConnections", activeConnections)
                .withDetail("databaseSizeMB", databaseSize / 1024 / 1024)
                .build();

        } catch (Exception e) {
            return Health.down()
                .withException(e)
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
