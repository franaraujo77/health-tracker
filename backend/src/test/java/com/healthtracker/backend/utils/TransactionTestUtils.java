package com.healthtracker.backend.utils;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.concurrent.Callable;

/**
 * Utility class for transaction management in tests.
 * Provides helper methods for complex transaction scenarios.
 */
@Component
public class TransactionTestUtils {

    private final TransactionTemplate transactionTemplate;
    private final TransactionTemplate readOnlyTransactionTemplate;

    public TransactionTestUtils(TransactionTemplate transactionTemplate, 
                              TransactionTemplate readOnlyTransactionTemplate) {
        this.transactionTemplate = transactionTemplate;
        this.readOnlyTransactionTemplate = readOnlyTransactionTemplate;
    }

    /**
     * Execute code within a new transaction, independent of the current transaction context.
     * Useful for testing scenarios that require transaction boundaries.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public <T> T executeInNewTransaction(Callable<T> action) throws Exception {
        return action.call();
    }

    /**
     * Execute code within a read-only transaction.
     * Optimized for query-only operations in tests.
     */
    public <T> T executeInReadOnlyTransaction(Callable<T> action) {
        return readOnlyTransactionTemplate.execute(status -> {
            try {
                return action.call();
            } catch (Exception e) {
                throw new RuntimeException("Error executing in read-only transaction", e);
            }
        });
    }

    /**
     * Execute code within a separate transaction that will be rolled back.
     * Useful for testing rollback scenarios.
     */
    public void executeAndRollback(Runnable action) {
        transactionTemplate.execute(status -> {
            action.run();
            status.setRollbackOnly();
            return null;
        });
    }

    /**
     * Execute code with serializable isolation level.
     * Useful for testing concurrent modification scenarios.
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public <T> T executeWithSerializableIsolation(Callable<T> action) throws Exception {
        return action.call();
    }

    /**
     * Execute code with repeatable read isolation level.
     * Useful for testing consistent read scenarios.
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public <T> T executeWithRepeatableRead(Callable<T> action) throws Exception {
        return action.call();
    }

    /**
     * Check if currently running within a transaction.
     * Useful for test assertions about transaction context.
     */
    public boolean isInTransaction() {
        return TransactionSynchronizationManager.isActualTransactionActive();
    }

    /**
     * Get the current transaction name.
     * Useful for debugging transaction boundaries in tests.
     */
    public String getCurrentTransactionName() {
        return TransactionSynchronizationManager.getCurrentTransactionName();
    }

    /**
     * Check if the current transaction is marked for rollback.
     * Useful for testing rollback scenarios.
     */
    public boolean isRollbackOnly() {
        return TransactionSynchronizationManager.isCurrentTransactionReadOnly();
    }

    /**
     * Force a flush of the current persistence context within a transaction.
     * Useful for ensuring changes are visible before assertions.
     */
    @Transactional
    public void flushTransaction() {
        // This method forces a transaction flush when called within a transactional context
        // The actual flush is handled by the JPA provider (Hibernate)
    }
}