package com.healthtracker.backend.config;

import org.flywaydb.core.Flyway;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;

/**
 * Test-specific data source configuration for enhanced database testing.
 * Provides optimized settings for test performance and isolation.
 */
@TestConfiguration
public class TestDataSourceConfig {

    /**
     * Configure Flyway for test environments with faster settings.
     */
    @Bean
    @Primary
    public Flyway testFlyway(DataSource dataSource) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .validateOnMigrate(true)
                .cleanDisabled(false) // Allow clean in tests
                .outOfOrder(false)
                .placeholderReplacement(false)
                .load();
    }

    /**
     * JdbcTemplate specifically configured for test operations.
     */
    @Bean
    public JdbcTemplate testJdbcTemplate(DataSource dataSource) {
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        jdbcTemplate.setQueryTimeout(30); // 30 second timeout for test queries
        jdbcTemplate.setSkipResultsProcessing(false);
        jdbcTemplate.setSkipUndeclaredResults(false);
        return jdbcTemplate;
    }

    /**
     * Transaction manager optimized for test scenarios.
     */
    @Bean
    public PlatformTransactionManager testDataSourceTransactionManager(DataSource dataSource) {
        DataSourceTransactionManager transactionManager = new DataSourceTransactionManager();
        transactionManager.setDataSource(dataSource);
        transactionManager.setDefaultTimeout(60); // Longer timeout for complex test scenarios
        transactionManager.setNestedTransactionAllowed(true);
        transactionManager.setValidateExistingTransaction(true);
        transactionManager.setGlobalRollbackOnParticipationFailure(true);
        return transactionManager;
    }
}