package com.healthtracker.backend.utils;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.test.context.TestContext;
import org.springframework.test.context.TestExecutionListener;

import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.List;

/**
 * Utility class for managing database schema in tests.
 * Provides methods for schema migration, cleanup, and verification.
 */
@Component
public class TestSchemaManager implements TestExecutionListener {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private Flyway flyway;

    /**
     * Clean and recreate the database schema using Flyway migrations.
     * This ensures a fresh, consistent state for each test.
     */
    public void cleanAndMigrateSchema() {
        flyway.clean();
        flyway.migrate();
    }

    /**
     * Reset only the data while keeping the schema intact.
     * More efficient than full migration for tests that only modify data.
     */
    public void resetData() {
        // Get all tables in reverse dependency order to avoid foreign key constraints
        List<String> tables = getTablesInReverseDependencyOrder();
        
        for (String table : tables) {
            jdbcTemplate.execute("DELETE FROM " + table);
            resetSequences(table);
        }
    }

    /**
     * Verify that the current schema matches the expected migration state.
     * Useful for ensuring test environment consistency.
     */
    public boolean verifySchemaState() {
        try {
            return flyway.info().current() != null && 
                   flyway.validateWithResult().validationSuccessful;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Get the current schema version from Flyway.
     */
    public String getCurrentSchemaVersion() {
        var current = flyway.info().current();
        return current != null ? current.getVersion().getVersion() : "No version";
    }

    /**
     * Execute a custom SQL script for test setup.
     * Useful for loading test-specific data or creating temporary objects.
     */
    public void executeScript(String scriptPath) {
        try {
            // Load and execute SQL script from classpath
            String script = loadScriptFromClasspath(scriptPath);
            jdbcTemplate.execute(script);
        } catch (Exception e) {
            throw new RuntimeException("Failed to execute script: " + scriptPath, e);
        }
    }

    /**
     * Create a test-specific schema that can be dropped after tests.
     * Useful for tests that need complete isolation.
     */
    public void createTestSchema(String schemaName) {
        jdbcTemplate.execute("CREATE SCHEMA IF NOT EXISTS " + schemaName);
    }

    /**
     * Drop a test-specific schema and all its objects.
     */
    public void dropTestSchema(String schemaName) {
        jdbcTemplate.execute("DROP SCHEMA IF EXISTS " + schemaName + " CASCADE");
    }

    /**
     * Check if a specific table exists in the database.
     */
    public boolean tableExists(String tableName) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?",
                Integer.class,
                tableName.toLowerCase()
            );
            return count != null && count > 0;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Get row count for a specific table.
     * Useful for verifying test data setup.
     */
    public long getRowCount(String tableName) {
        return jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM " + tableName,
            Long.class
        );
    }

    /**
     * Backup current database state to a temporary location.
     * Can be restored later for complex test scenarios.
     */
    public String backupDatabase() {
        String backupName = "test_backup_" + System.currentTimeMillis();
        jdbcTemplate.execute("CREATE SCHEMA " + backupName);
        
        // Copy all tables to backup schema
        List<String> tables = getAllTables();
        for (String table : tables) {
            jdbcTemplate.execute(String.format(
                "CREATE TABLE %s.%s AS SELECT * FROM %s",
                backupName, table, table
            ));
        }
        
        return backupName;
    }

    /**
     * Restore database state from a previous backup.
     */
    public void restoreDatabase(String backupName) {
        resetData();
        
        List<String> tables = getAllTables();
        for (String table : tables) {
            jdbcTemplate.execute(String.format(
                "INSERT INTO %s SELECT * FROM %s.%s",
                table, backupName, table
            ));
        }
        
        dropTestSchema(backupName);
    }

    @Override
    public void beforeTestClass(TestContext testContext) {
        // Ensure schema is in a clean state before test class execution
        if (!verifySchemaState()) {
            cleanAndMigrateSchema();
        }
    }

    @Override
    public void beforeTestMethod(TestContext testContext) {
        // Reset data before each test method for isolation
        resetData();
    }

    private List<String> getTablesInReverseDependencyOrder() {
        return jdbcTemplate.queryForList(
            """
            WITH RECURSIVE table_deps AS (
                SELECT 
                    tc.table_name,
                    tc.constraint_name,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    0 as depth
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu 
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_schema = 'public'
                
                UNION ALL
                
                SELECT 
                    td.foreign_table_name,
                    td.constraint_name,
                    td.column_name,
                    tc.table_name,
                    td.depth + 1
                FROM table_deps td
                JOIN information_schema.table_constraints tc 
                    ON tc.table_name = td.table_name
                WHERE td.depth < 10
            )
            SELECT DISTINCT table_name
            FROM table_deps
            ORDER BY depth DESC
            """,
            String.class
        );
    }

    private void resetSequences(String tableName) {
        try {
            // Reset sequences for tables with auto-increment columns
            jdbcTemplate.queryForList(
                """
                SELECT column_default
                FROM information_schema.columns
                WHERE table_name = ? 
                    AND column_default LIKE 'nextval%'
                """,
                String.class,
                tableName
            ).forEach(sequenceDefault -> {
                String sequenceName = sequenceDefault
                    .replaceAll("nextval\\('([^']+)'.*", "$1");
                jdbcTemplate.execute("ALTER SEQUENCE " + sequenceName + " RESTART WITH 1");
            });
        } catch (Exception e) {
            // Ignore sequence reset errors for tables without sequences
        }
    }

    private List<String> getAllTables() {
        return jdbcTemplate.queryForList(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
                AND table_type = 'BASE TABLE'
            ORDER BY table_name
            """,
            String.class
        );
    }

    private String loadScriptFromClasspath(String scriptPath) {
        try {
            var resource = getClass().getClassLoader().getResourceAsStream(scriptPath);
            if (resource == null) {
                throw new RuntimeException("Script not found: " + scriptPath);
            }
            return new String(resource.readAllBytes());
        } catch (Exception e) {
            throw new RuntimeException("Failed to load script: " + scriptPath, e);
        }
    }
}