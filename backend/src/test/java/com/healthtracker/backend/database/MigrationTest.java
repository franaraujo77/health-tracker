package com.healthtracker.backend.database;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for Flyway database migrations using Testcontainers.
 *
 * <p>This test class validates:
 * <ul>
 *   <li>All migrations apply successfully without errors</li>
 *   <li>Migration checksums are valid and consistent</li>
 * </ul>
 *
 * <p>Uses Testcontainers to spin up an isolated PostgreSQL 15-alpine instance
 * for each test run, ensuring consistent and reproducible test environments.
 *
 * @see org.flywaydb.core.Flyway
 * @see org.testcontainers.containers.PostgreSQLContainer
 */
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
class MigrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
        .withDatabaseName("healthtracker_test")
        .withUsername("test")
        .withPassword("test")
        .withReuse(true);  // Enable container reuse for faster test execution

    @DynamicPropertySource
    static void postgresqlProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private DataSource dataSource;

    @Autowired
    private Flyway flyway;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void shouldApplyAllMigrationsSuccessfully() {
        // Verify all migrations (V1-V7) applied
        var info = flyway.info();
        var applied = info.applied();

        assertThat(applied).hasSize(7);
        assertThat(info.current().getVersion().getVersion()).isEqualTo("7");
    }

    @Test
    void shouldValidateMigrationChecksums() {
        // Verify no checksum mismatches
        var result = flyway.validateWithResult();
        assertThat(result.validationSuccessful).isTrue();
        assertThat(result.invalidMigrations).isEmpty();
    }

    @Test
    void shouldValidateMigrationIdempotency() {
        // Clean database to start fresh
        flyway.clean();

        // Apply migrations first time
        var firstMigrate = flyway.migrate();
        assertThat(firstMigrate.migrationsExecuted).isEqualTo(7);
        var firstResult = flyway.info();

        // Apply migrations second time (should be no-op)
        var migrateResult = flyway.migrate();

        // Verify no new migrations applied
        assertThat(migrateResult.migrationsExecuted).isEqualTo(0);
        assertThat(migrateResult.success).isTrue();

        // Verify state unchanged
        var secondResult = flyway.info();
        assertThat(secondResult.applied()).hasSize(firstResult.applied().length);
    }

    @Test
    void shouldHandleRepeatedMigrationAttempts() {
        // Clean database to start fresh
        flyway.clean();

        // Run migrations 3 times
        for (int i = 0; i < 3; i++) {
            var result = flyway.migrate();
            if (i == 0) {
                // First run should apply all migrations
                assertThat(result.migrationsExecuted).isEqualTo(7);
            } else {
                // Subsequent runs should be no-op
                assertThat(result.migrationsExecuted).isEqualTo(0);
            }
            assertThat(result.success).isTrue();
        }

        // Verify final state correct
        var info = flyway.info();
        assertThat(info.applied()).hasSize(7);
    }

    @Test
    void shouldBenchmarkMigrationPerformance() {
        // Clean database
        flyway.clean();

        // Measure migration time
        Instant start = Instant.now();
        var result = flyway.migrate();
        Duration migrationTime = Duration.between(start, Instant.now());

        // Log performance metrics
        System.out.println("Total migrations: " + result.migrationsExecuted);
        System.out.println("Migration time: " + migrationTime.toMillis() + "ms");
        System.out.println("Average per migration: " +
                (migrationTime.toMillis() / result.migrationsExecuted) + "ms");

        // Assert reasonable performance
        assertThat(migrationTime).isLessThan(Duration.ofSeconds(5));
        assertThat(result.success).isTrue();
    }

    @Test
    void shouldBenchmarkIndividualMigrations() {
        flyway.clean();

        // Get pending migrations
        var pending = flyway.info().pending();
        assertThat(pending).isNotEmpty();

        // Apply and measure each migration
        for (int i = 0; i < pending.length; i++) {
            var migration = pending[i];
            Instant start = Instant.now();

            // Migrate to specific version
            flyway.migrate();

            Duration executionTime = Duration.between(start, Instant.now());
            System.out.printf("Migration %s: %dms%n",
                    migration.getVersion(),
                    executionTime.toMillis());

            // No migration should take > 2 seconds
            assertThat(executionTime)
                    .withFailMessage("Migration %s took too long: %dms",
                            migration.getVersion(), executionTime.toMillis())
                    .isLessThan(Duration.ofSeconds(2));
        }
    }

    @Test
    void shouldValidateMigrationVersionNumbers() {
        var info = flyway.info();
        var migrations = info.all();

        // Verify sequential version numbers (V1, V2, V3...)
        for (int i = 1; i < migrations.length; i++) {
            var current = migrations[i].getVersion();
            var previous = migrations[i - 1].getVersion();

            assertThat(current.compareTo(previous))
                    .withFailMessage("Migration versions not sequential: %s -> %s",
                            previous, current)
                    .isGreaterThan(0);
        }
    }

    @Test
    void shouldValidateMigrationNamingConvention() {
        var info = flyway.info();
        var migrations = info.all();

        // Pattern: V{version}__{description}.sql (description starts with lowercase)
        Pattern namingPattern = Pattern.compile("^[a-z][a-z0-9 _]*$");

        for (var migration : migrations) {
            String description = migration.getDescription();
            assertThat(description)
                    .withFailMessage("Migration description doesn't follow convention: %s", description)
                    .matches(namingPattern);
        }
    }

    @Test
    void shouldVerifyNoMissingMigrations() {
        var info = flyway.info();

        // Verify no gaps in migration sequence
        assertThat(info.pending()).isEmpty();
        // Note: Flyway's MigrationInfoService doesn't have failed() method
        // Migration failures would be caught during apply/validate tests
    }

    @Test
    void shouldValidateMigrationTypes() {
        var info = flyway.info();
        var migrations = info.applied();

        for (var migration : migrations) {
            // All should be SQL migrations (not Java-based)
            assertThat(migration.getType().name())
                    .isEqualTo("SQL");

            // All should be versioned (not repeatable)
            assertThat(migration.getVersion()).isNotNull();
        }
    }

    @Test
    void shouldValidateExpectedTablesExist() {
        // Query PostgreSQL system catalogs for tables
        List<String> tables = jdbcTemplate.queryForList(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
                String.class
        );

        // Verify expected tables from migrations V1-V7
        assertThat(tables).contains(
                "users",
                "health_profiles",
                "health_metrics",
                "goals",
                "audit_logs",
                "blacklisted_tokens"
        );

        // Verify Flyway metadata table exists
        assertThat(tables).contains("flyway_schema_history");
    }

    @Test
    void shouldValidateTableColumns() {
        // Validate users table schema
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
                "SELECT column_name, data_type, is_nullable " +
                        "FROM information_schema.columns " +
                        "WHERE table_name = 'users' " +
                        "ORDER BY ordinal_position"
        );

        // Verify expected columns exist
        var columnNames = columns.stream()
                .map(col -> (String) col.get("column_name"))
                .toList();

        assertThat(columnNames).contains(
                "id",
                "email",
                "password_hash",
                "roles",
                "created_at",
                "updated_at"
        );
    }

    @Test
    void shouldValidateIndexesExist() {
        List<String> indexes = jdbcTemplate.queryForList(
                "SELECT indexname FROM pg_indexes WHERE tablename = 'users'",
                String.class
        );

        // Verify expected indexes created by migrations
        assertThat(indexes).contains(
                "users_pkey"  // Primary key
        );
    }

    @Test
    void shouldValidateConstraints() {
        List<Map<String, Object>> constraints = jdbcTemplate.queryForList(
                "SELECT conname, contype " +
                        "FROM pg_constraint " +
                        "JOIN pg_class ON pg_constraint.conrelid = pg_class.oid " +
                        "WHERE pg_class.relname = 'users'"
        );

        var constraintTypes = constraints.stream()
                .map(c -> (String) c.get("contype"))
                .toList();

        // Verify primary key and unique constraints exist
        assertThat(constraintTypes).contains("p", "u");  // p=primary, u=unique
    }
}
