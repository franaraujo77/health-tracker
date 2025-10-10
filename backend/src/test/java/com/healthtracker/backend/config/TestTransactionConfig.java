package com.healthtracker.backend.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;

/**
 * Test-specific transaction management configuration.
 * Provides enhanced transaction control for testing scenarios.
 */
@TestConfiguration
@EnableTransactionManagement
public class TestTransactionConfig {

    /**
     * Primary transaction manager for test scenarios.
     * Ensures proper transaction boundary management in tests.
     */
    @Bean
    @Primary
    public PlatformTransactionManager testTransactionManager(DataSource dataSource) {
        DataSourceTransactionManager transactionManager = new DataSourceTransactionManager();
        transactionManager.setDataSource(dataSource);
        transactionManager.setDefaultTimeout(30); // 30 seconds timeout for test transactions
        transactionManager.setNestedTransactionAllowed(true);
        return transactionManager;
    }

    /**
     * Transaction template for programmatic transaction management in tests.
     * Useful for scenarios requiring fine-grained transaction control.
     */
    @Bean
    public TransactionTemplate testTransactionTemplate(PlatformTransactionManager transactionManager) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setTimeout(30);
        template.setReadOnly(false);
        return template;
    }

    /**
     * Read-only transaction template for query-only test scenarios.
     * Optimizes performance for tests that don't modify data.
     */
    @Bean
    public TransactionTemplate readOnlyTransactionTemplate(PlatformTransactionManager transactionManager) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setTimeout(30);
        template.setReadOnly(true);
        return template;
    }
}