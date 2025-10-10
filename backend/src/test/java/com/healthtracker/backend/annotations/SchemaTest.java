package com.healthtracker.backend.annotations;

import com.healthtracker.backend.utils.TestSchemaManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation for tests that require schema management capabilities.
 * Automatically includes TestSchemaManager and sets up execution listeners.
 */
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Import(TestSchemaManager.class)
@TestExecutionListeners(value = {
    DependencyInjectionTestExecutionListener.class,
    TestSchemaManager.class
}, mergeMode = TestExecutionListeners.MergeMode.MERGE_WITH_DEFAULTS)
public @interface SchemaTest {
    
    /**
     * Whether to perform a full schema migration before test class execution.
     * Default is false for better performance.
     */
    boolean fullMigration() default false;
    
    /**
     * Whether to reset data before each test method.
     * Default is true for test isolation.
     */
    boolean resetData() default true;
    
    /**
     * Custom SQL scripts to execute during test setup.
     * Scripts should be located in src/test/resources/sql/.
     */
    String[] setupScripts() default {};
    
    /**
     * Custom SQL scripts to execute during test cleanup.
     * Scripts should be located in src/test/resources/sql/.
     */
    String[] cleanupScripts() default {};
}