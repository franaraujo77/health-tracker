package com.healthtracker.backend.database;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;

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
        .withPassword("test");

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
}
