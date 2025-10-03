package com.healthtracker.backend.service;

import com.healthtracker.backend.entity.HealthMetrics;
import com.healthtracker.backend.entity.User;
import com.healthtracker.backend.repository.HealthMetricsRepository;
import com.healthtracker.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class HealthMetricsService {

    private final HealthMetricsRepository healthMetricsRepository;
    private final UserRepository userRepository;

    /**
     * Record a new health metric for a user.
     *
     * @param userId the user's UUID
     * @param healthMetrics the health metric to record
     * @return the saved health metric
     * @throws IllegalArgumentException if user not found
     */
    @Transactional
    public HealthMetrics recordMetric(UUID userId, HealthMetrics healthMetrics) {
        log.info("Recording health metric for user: {} - type: {}", userId, healthMetrics.getMetricType());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        healthMetrics.setUser(user);

        // Set recorded time if not provided
        if (healthMetrics.getRecordedAt() == null) {
            healthMetrics.setRecordedAt(Instant.now());
        }

        HealthMetrics savedMetric = healthMetricsRepository.save(healthMetrics);
        log.info("Health metric recorded with ID: {}", savedMetric.getId());
        return savedMetric;
    }

    /**
     * Get all health metrics for a user.
     * Results ordered by recorded date descending (newest first).
     *
     * @param userId the user's UUID
     * @return list of health metrics
     * @throws IllegalArgumentException if user not found
     */
    @Transactional(readOnly = true)
    public List<HealthMetrics> getUserMetrics(UUID userId) {
        log.debug("Retrieving all health metrics for user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        return healthMetricsRepository.findByUserOrderByRecordedAtDesc(user);
    }

    /**
     * Get health metrics for a user within a date range.
     *
     * @param userId the user's UUID
     * @param startDate the start of the date range (inclusive)
     * @param endDate the end of the date range (inclusive)
     * @return list of health metrics within the date range
     * @throws IllegalArgumentException if user not found
     */
    @Transactional(readOnly = true)
    public List<HealthMetrics> getUserMetricsByDateRange(UUID userId, Instant startDate, Instant endDate) {
        log.debug("Retrieving health metrics for user: {} between {} and {}", userId, startDate, endDate);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        return healthMetricsRepository.findByUserAndRecordedAtBetweenOrderByRecordedAtDesc(user, startDate, endDate);
    }

    /**
     * Get health metrics of a specific type for a user.
     *
     * @param userId the user's UUID
     * @param metricType the type of metric (e.g., "heart_rate", "steps")
     * @return list of health metrics of the specified type
     */
    @Transactional(readOnly = true)
    public List<HealthMetrics> getUserMetricsByType(UUID userId, String metricType) {
        log.debug("Retrieving health metrics for user: {} of type: {}", userId, metricType);
        return healthMetricsRepository.findByUserIdAndMetricTypeOrderByRecordedAtDesc(userId, metricType);
    }

    /**
     * Get the most recent health metric of a specific type for a user.
     * Useful for dashboard displays showing current values.
     *
     * @param userId the user's UUID
     * @param metricType the type of metric
     * @return Optional containing the latest metric, or empty if none exist
     */
    @Transactional(readOnly = true)
    public Optional<HealthMetrics> getLatestMetricByType(UUID userId, String metricType) {
        log.debug("Retrieving latest health metric for user: {} of type: {}", userId, metricType);
        HealthMetrics latest = healthMetricsRepository.findLatestByUserIdAndMetricType(userId, metricType);
        return Optional.ofNullable(latest);
    }

    /**
     * Update an existing health metric.
     *
     * @param metricId the metric's UUID
     * @param updatedMetric the updated metric data
     * @return the updated health metric
     * @throws IllegalArgumentException if metric not found
     */
    @Transactional
    public HealthMetrics updateMetric(UUID metricId, HealthMetrics updatedMetric) {
        log.info("Updating health metric: {}", metricId);

        HealthMetrics existingMetric = healthMetricsRepository.findById(metricId)
                .orElseThrow(() -> new IllegalArgumentException("Health metric not found: " + metricId));

        existingMetric.setMetricType(updatedMetric.getMetricType());
        existingMetric.setValue(updatedMetric.getValue());
        existingMetric.setUnit(updatedMetric.getUnit());
        existingMetric.setSource(updatedMetric.getSource());

        if (updatedMetric.getRecordedAt() != null) {
            existingMetric.setRecordedAt(updatedMetric.getRecordedAt());
        }

        HealthMetrics savedMetric = healthMetricsRepository.save(existingMetric);
        log.info("Health metric updated: {}", metricId);
        return savedMetric;
    }

    /**
     * Delete a health metric.
     *
     * @param metricId the metric's UUID
     * @throws IllegalArgumentException if metric not found
     */
    @Transactional
    public void deleteMetric(UUID metricId) {
        log.info("Deleting health metric: {}", metricId);

        if (!healthMetricsRepository.existsById(metricId)) {
            throw new IllegalArgumentException("Health metric not found: " + metricId);
        }

        healthMetricsRepository.deleteById(metricId);
        log.info("Health metric deleted: {}", metricId);
    }

    /**
     * Delete all health metrics for a user.
     *
     * @param userId the user's UUID
     */
    @Transactional
    public void deleteAllUserMetrics(UUID userId) {
        log.info("Deleting all health metrics for user: {}", userId);
        healthMetricsRepository.deleteByUserId(userId);
        log.info("All health metrics deleted for user: {}", userId);
    }
}
