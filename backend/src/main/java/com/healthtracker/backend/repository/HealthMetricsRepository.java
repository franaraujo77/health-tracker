package com.healthtracker.backend.repository;

import com.healthtracker.backend.entity.HealthMetrics;
import com.healthtracker.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface HealthMetricsRepository extends JpaRepository<HealthMetrics, UUID> {

    /**
     * Find all health metrics for a specific user.
     * Results are ordered by recorded date descending (newest first).
     *
     * @param user the user entity
     * @return list of health metrics
     */
    List<HealthMetrics> findByUserOrderByRecordedAtDesc(User user);

    /**
     * Find health metrics for a user within a date range.
     * Uses the composite index (user_id, recorded_at) for optimal performance.
     *
     * @param user the user entity
     * @param startDate the start of the date range (inclusive)
     * @param endDate the end of the date range (inclusive)
     * @return list of health metrics within the date range
     */
    List<HealthMetrics> findByUserAndRecordedAtBetweenOrderByRecordedAtDesc(
            User user,
            Instant startDate,
            Instant endDate
    );

    /**
     * Find health metrics by user ID and metric type.
     * Useful for retrieving specific types of metrics (e.g., heart_rate, steps).
     *
     * @param userId the user's UUID
     * @param metricType the type of metric (e.g., "heart_rate", "steps")
     * @return list of health metrics of the specified type
     */
    List<HealthMetrics> findByUserIdAndMetricTypeOrderByRecordedAtDesc(
            UUID userId,
            String metricType
    );

    /**
     * Find the most recent health metric of a specific type for a user.
     * Used for dashboard displays showing current values.
     *
     * @param userId the user's UUID
     * @param metricType the type of metric
     * @return the most recent metric, or null if none exist
     */
    @Query("SELECT hm FROM HealthMetrics hm WHERE hm.user.id = :userId " +
           "AND hm.metricType = :metricType ORDER BY hm.recordedAt DESC LIMIT 1")
    HealthMetrics findLatestByUserIdAndMetricType(
            @Param("userId") UUID userId,
            @Param("metricType") String metricType
    );

    /**
     * Delete all health metrics for a specific user.
     * Used when a user account is deleted.
     *
     * @param userId the user's UUID
     */
    void deleteByUserId(UUID userId);
}
