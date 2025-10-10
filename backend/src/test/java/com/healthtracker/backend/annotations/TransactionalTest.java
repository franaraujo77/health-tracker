package com.healthtracker.backend.annotations;

import org.springframework.test.annotation.Rollback;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Custom annotation for transactional tests with default settings.
 * Provides automatic rollback and default isolation level for test methods.
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Transactional(
    propagation = Propagation.REQUIRED,
    isolation = Isolation.READ_COMMITTED,
    timeout = 30
)
@Rollback
public @interface TransactionalTest {
    
    /**
     * Override the default isolation level for specific test scenarios.
     */
    Isolation isolation() default Isolation.READ_COMMITTED;
    
    /**
     * Override the default propagation behavior.
     */
    Propagation propagation() default Propagation.REQUIRED;
    
    /**
     * Specify if this test should be read-only.
     */
    boolean readOnly() default false;
    
    /**
     * Override the default timeout (30 seconds).
     */
    int timeout() default 30;
}