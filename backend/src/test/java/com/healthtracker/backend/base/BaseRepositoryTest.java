package com.healthtracker.backend.base;

import com.healthtracker.backend.BaseIntegrationTest;
import com.healthtracker.backend.annotations.IntegrationTest;
import com.healthtracker.backend.annotations.SchemaTest;
import com.healthtracker.backend.annotations.TransactionalTest;
import com.healthtracker.backend.config.TestDataSourceConfig;
import com.healthtracker.backend.config.TestTransactionConfig;
import com.healthtracker.backend.utils.TestSchemaManager;
import com.healthtracker.backend.utils.TransactionTestUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.support.TransactionTemplate;

import jakarta.persistence.EntityManager;

/**
 * Base class for repository integration tests that require database access.
 * Provides enhanced transaction management and entity manager utilities.
 */
@IntegrationTest
@TransactionalTest
@SchemaTest
@Import({TestTransactionConfig.class, TestDataSourceConfig.class})
public abstract class BaseRepositoryTest extends BaseIntegrationTest {

    @Autowired
    protected TransactionTestUtils transactionTestUtils;

    @Autowired
    protected TestSchemaManager schemaManager;

    @Autowired
    protected TransactionTemplate transactionTemplate;

    @Autowired
    protected TransactionTemplate readOnlyTransactionTemplate;

    /**
     * Utility method to flush and clear the persistence context.
     * Useful for ensuring changes are persisted before validation.
     */
    protected void flushAndClear(TestEntityManager entityManager) {
        entityManager.flush();
        entityManager.clear();
    }

    /**
     * Utility method to flush and clear the persistence context using EntityManager.
     * Alternative to TestEntityManager for more flexible scenarios.
     */
    protected void flushAndClear(EntityManager entityManager) {
        entityManager.flush();
        entityManager.clear();
    }

    /**
     * Execute a repository operation within a new transaction.
     * Useful for testing transaction boundary scenarios.
     */
    protected <T> T executeInNewTransaction(java.util.concurrent.Callable<T> operation) {
        try {
            return transactionTestUtils.executeInNewTransaction(operation);
        } catch (Exception e) {
            throw new RuntimeException("Error executing repository operation in new transaction", e);
        }
    }

    /**
     * Reset all data in the database while keeping the schema intact.
     * More efficient than full migration for tests that only modify data.
     */
    protected void resetTestData() {
        schemaManager.resetData();
    }

    /**
     * Execute a custom SQL script for test setup.
     * Useful for loading test-specific data.
     */
    protected void executeTestScript(String scriptPath) {
        schemaManager.executeScript(scriptPath);
    }

    /**
     * Get row count for a specific table.
     * Useful for verifying test data setup and assertions.
     */
    protected long getTableRowCount(String tableName) {
        return schemaManager.getRowCount(tableName);
    }

    /**
     * Verify that a table exists in the database.
     * Useful for schema-dependent tests.
     */
    protected boolean verifyTableExists(String tableName) {
        return schemaManager.tableExists(tableName);
    }
}