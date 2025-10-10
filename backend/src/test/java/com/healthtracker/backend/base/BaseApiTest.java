package com.healthtracker.backend.base;

import com.healthtracker.backend.BaseIntegrationTest;
import com.healthtracker.backend.annotations.ApiTest;
import com.healthtracker.backend.annotations.SchemaTest;
import com.healthtracker.backend.config.TestDataSourceConfig;
import com.healthtracker.backend.config.TestTransactionConfig;
import com.healthtracker.backend.utils.TestSchemaManager;
import com.healthtracker.backend.utils.TransactionTestUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;
import org.springframework.test.context.transaction.TransactionalTestExecutionListener;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Base class for API integration tests that require HTTP client testing.
 * Provides TestRestTemplate and transaction utilities for API endpoint testing.
 */
@ApiTest
@SchemaTest
@Import({TestTransactionConfig.class, TestDataSourceConfig.class})
@TestExecutionListeners({
    DependencyInjectionTestExecutionListener.class,
    TransactionalTestExecutionListener.class
})
public abstract class BaseApiTest extends BaseIntegrationTest {

    @LocalServerPort
    protected int port;

    @Autowired
    protected TestRestTemplate restTemplate;

    @Autowired
    protected TransactionTestUtils transactionTestUtils;

    @Autowired
    protected TestSchemaManager schemaManager;

    @Autowired
    protected TransactionTemplate transactionTemplate;

    @Autowired
    protected TransactionTemplate readOnlyTransactionTemplate;

    protected String getBaseUrl() {
        return "http://localhost:" + port;
    }

    protected String getApiUrl(String endpoint) {
        return getBaseUrl() + "/api/v1" + endpoint;
    }

    /**
     * Execute database operations within a separate transaction from the API call.
     * Useful for setting up test data or verifying database state after API calls.
     */
    protected <T> T executeInSeparateTransaction(java.util.concurrent.Callable<T> operation) {
        try {
            return transactionTestUtils.executeInNewTransaction(operation);
        } catch (Exception e) {
            throw new RuntimeException("Error executing operation in separate transaction", e);
        }
    }

    /**
     * Reset all data in the database while keeping the schema intact.
     * Useful for API tests that need clean data state between test methods.
     */
    protected void resetTestData() {
        schemaManager.resetData();
    }

    /**
     * Execute a custom SQL script for test setup.
     * Useful for loading test-specific data before API calls.
     */
    protected void executeTestScript(String scriptPath) {
        schemaManager.executeScript(scriptPath);
    }

    /**
     * Get row count for a specific table.
     * Useful for verifying API operations affect the correct number of records.
     */
    protected long getTableRowCount(String tableName) {
        return schemaManager.getRowCount(tableName);
    }

    /**
     * Create a database backup before test execution.
     * Useful for complex API test scenarios that need rollback capability.
     */
    protected String createDatabaseBackup() {
        return schemaManager.backupDatabase();
    }

    /**
     * Restore database from a backup.
     * Useful for rolling back to a known state after complex API tests.
     */
    protected void restoreDatabaseBackup(String backupName) {
        schemaManager.restoreDatabase(backupName);
    }
}