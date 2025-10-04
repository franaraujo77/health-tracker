package com.healthtracker.backend.monitoring;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

/**
 * Custom database metrics for monitoring query execution.
 *
 * Provides:
 * - Query execution counter (total queries)
 * - Query execution timer (duration tracking)
 *
 * Usage in repositories:
 * <pre>
 * {@code
 * @Autowired
 * private DatabaseMetrics databaseMetrics;
 *
 * public User findUser(Long id) {
 *     databaseMetrics.incrementQueryCount();
 *     Timer.Sample sample = databaseMetrics.startQueryTimer();
 *     try {
 *         return userRepository.findById(id);
 *     } finally {
 *         databaseMetrics.recordQueryTime(sample, "findById");
 *     }
 * }
 * }
 * </pre>
 */
@Component
public class DatabaseMetrics {

    private final MeterRegistry meterRegistry;
    private final Counter queryCounter;

    public DatabaseMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;

        this.queryCounter = Counter.builder("database.queries.total")
            .description("Total number of database queries executed")
            .tag("application", "health-tracker")
            .register(meterRegistry);
    }

    /**
     * Increment the total query counter.
     * Call this method before executing any database query.
     */
    public void incrementQueryCount() {
        queryCounter.increment();
    }

    /**
     * Start a timer for query execution.
     *
     * @return Timer sample to be stopped after query execution
     */
    public Timer.Sample startQueryTimer() {
        return Timer.start(meterRegistry);
    }

    /**
     * Record query execution time with a specific query type tag.
     *
     * @param sample Timer sample from startQueryTimer()
     * @param queryType Type of query (e.g., "findById", "findAll", "save")
     */
    public void recordQueryTime(Timer.Sample sample, String queryType) {
        sample.stop(Timer.builder("database.query.duration")
            .description("Database query execution time")
            .tag("application", "health-tracker")
            .tag("query_type", queryType)
            .register(meterRegistry));
    }

    /**
     * Record query execution time with query type and entity tags.
     *
     * @param sample Timer sample from startQueryTimer()
     * @param queryType Type of query (e.g., "findById", "findAll", "save")
     * @param entity Entity name (e.g., "User", "HealthProfile")
     */
    public void recordQueryTime(Timer.Sample sample, String queryType, String entity) {
        sample.stop(Timer.builder("database.query.duration")
            .description("Database query execution time")
            .tag("application", "health-tracker")
            .tag("query_type", queryType)
            .tag("entity", entity)
            .register(meterRegistry));
    }
}
