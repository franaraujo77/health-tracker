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
import org.springframework.context.annotation.Import;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Base class for service layer integration tests.
 * Provides enhanced transaction management for service-level testing.
 */
@IntegrationTest
@TransactionalTest
@SchemaTest
@Import({TestTransactionConfig.class, TestDataSourceConfig.class})
public abstract class BaseServiceTest extends BaseIntegrationTest {

    @Autowired
    protected TransactionTestUtils transactionTestUtils;

    @Autowired
    protected TestSchemaManager schemaManager;

    @Autowired
    protected TransactionTemplate transactionTemplate;

    @Autowired
    protected TransactionTemplate readOnlyTransactionTemplate;

    /**
     * Reset all data in the database while keeping the schema intact.
     * Useful for service tests that need clean data state.
     */
    protected void resetTestData() {
        schemaManager.resetData();
    }

    /**
     * Execute a custom SQL script for test setup.
     * Useful for loading test-specific data for service testing.
     */
    protected void executeTestScript(String scriptPath) {
        schemaManager.executeScript(scriptPath);
    }

    /**
     * Get row count for a specific table.
     * Useful for verifying service operations affect the correct number of records.
     */
    protected long getTableRowCount(String tableName) {
        return schemaManager.getRowCount(tableName);
    }
}