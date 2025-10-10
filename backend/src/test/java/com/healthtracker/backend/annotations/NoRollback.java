package com.healthtracker.backend.annotations;

import org.springframework.test.annotation.Commit;
import org.springframework.transaction.annotation.Transactional;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation for tests that need to commit their transactions.
 * Useful for testing scenarios where data needs to persist across test boundaries.
 * 
 * WARNING: Use with caution as this can affect test isolation.
 * Ensure proper cleanup is performed after such tests.
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Transactional
@Commit
public @interface NoRollback {
}