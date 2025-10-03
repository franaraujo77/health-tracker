package com.healthtracker.backend;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base class for integration tests that require a PostgreSQL database.
 * Uses Testcontainers with @ServiceConnection for automatic configuration.
 */
@SpringBootTest
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    static {
        postgres.start();
    }
}
