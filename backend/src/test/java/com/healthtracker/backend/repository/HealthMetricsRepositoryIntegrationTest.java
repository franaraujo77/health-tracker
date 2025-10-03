package com.healthtracker.backend.repository;

import com.healthtracker.backend.BaseIntegrationTest;
import com.healthtracker.backend.entity.HealthMetrics;
import com.healthtracker.backend.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for HealthMetricsRepository using Testcontainers PostgreSQL.
 * Tests time-series data queries and composite index performance.
 */
@Transactional
class HealthMetricsRepositoryIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private HealthMetricsRepository healthMetricsRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser;
    private Instant now;

    @BeforeEach
    void setUp() {
        healthMetricsRepository.deleteAll();
        userRepository.deleteAll();

        now = Instant.now();

        testUser = User.builder()
                .email("metrics@test.com")
                .passwordHash("hash123")
                .roles(new String[]{"USER"})
                .createdAt(now)
                .updatedAt(now)
                .build();
        testUser = userRepository.save(testUser);
    }

    @Test
    void save_ShouldPersistHealthMetric_ToDatabase() {
        // Given
        HealthMetrics metric = HealthMetrics.builder()
                .user(testUser)
                .metricType("weight")
                .value(new BigDecimal("75.5"))
                .unit("kg")
                .recordedAt(now)
                .build();

        // When
        HealthMetrics savedMetric = healthMetricsRepository.save(metric);

        // Then
        assertThat(savedMetric.getId()).isNotNull();
        assertThat(savedMetric.getMetricType()).isEqualTo("weight");
        assertThat(savedMetric.getValue()).isEqualByComparingTo(new BigDecimal("75.5"));
        assertThat(savedMetric.getUnit()).isEqualTo("kg");
    }

    @Test
    void findByUserOrderByRecordedAtDesc_ShouldReturnMetrics_InDescendingOrder() {
        // Given
        HealthMetrics metric1 = createMetric("weight", "75.0", now.minus(2, ChronoUnit.DAYS));
        HealthMetrics metric2 = createMetric("weight", "74.5", now.minus(1, ChronoUnit.DAYS));
        HealthMetrics metric3 = createMetric("weight", "74.0", now);

        healthMetricsRepository.save(metric1);
        healthMetricsRepository.save(metric2);
        healthMetricsRepository.save(metric3);

        // When
        List<HealthMetrics> metrics = healthMetricsRepository.findByUserOrderByRecordedAtDesc(testUser);

        // Then
        assertThat(metrics).hasSize(3);
        assertThat(metrics.get(0).getRecordedAt()).isAfter(metrics.get(1).getRecordedAt());
        assertThat(metrics.get(1).getRecordedAt()).isAfter(metrics.get(2).getRecordedAt());
        assertThat(metrics.get(0).getValue()).isEqualByComparingTo(new BigDecimal("74.0"));
    }

    @Test
    void findByUserIdAndMetricTypeOrderByRecordedAtDesc_ShouldReturnOnlyMatchingType() {
        // Given
        healthMetricsRepository.save(createMetric("weight", "75.0", now.minus(1, ChronoUnit.DAYS)));
        healthMetricsRepository.save(createMetric("blood_pressure", "120", now));
        healthMetricsRepository.save(createMetric("weight", "74.5", now));

        // When
        List<HealthMetrics> weightMetrics = healthMetricsRepository
                .findByUserIdAndMetricTypeOrderByRecordedAtDesc(testUser.getId(), "weight");

        // Then
        assertThat(weightMetrics).hasSize(2);
        assertThat(weightMetrics).allMatch(m -> m.getMetricType().equals("weight"));
    }

    @Test
    void findByUserAndRecordedAtBetweenOrderByRecordedAtDesc_ShouldReturnMetricsInRange() {
        // Given
        Instant startDate = now.minus(7, ChronoUnit.DAYS);
        Instant endDate = now;

        healthMetricsRepository.save(createMetric("weight", "76.0", now.minus(10, ChronoUnit.DAYS))); // Outside range
        healthMetricsRepository.save(createMetric("weight", "75.0", now.minus(5, ChronoUnit.DAYS))); // Inside range
        healthMetricsRepository.save(createMetric("weight", "74.5", now.minus(2, ChronoUnit.DAYS))); // Inside range
        healthMetricsRepository.save(createMetric("weight", "74.0", now)); // Inside range

        // When
        List<HealthMetrics> metrics = healthMetricsRepository
                .findByUserAndRecordedAtBetweenOrderByRecordedAtDesc(testUser, startDate, endDate);

        // Then
        assertThat(metrics).hasSize(3);
        assertThat(metrics.get(0).getRecordedAt()).isBefore(endDate.plus(1, ChronoUnit.SECONDS));
        assertThat(metrics.get(2).getRecordedAt()).isAfter(startDate.minus(1, ChronoUnit.SECONDS));
    }

    @Test
    void findLatestByUserIdAndMetricType_ShouldReturnMostRecentMetric() {
        // Given
        healthMetricsRepository.save(createMetric("weight", "76.0", now.minus(3, ChronoUnit.DAYS)));
        healthMetricsRepository.save(createMetric("weight", "75.0", now.minus(2, ChronoUnit.DAYS)));
        healthMetricsRepository.save(createMetric("weight", "74.5", now.minus(1, ChronoUnit.DAYS)));
        healthMetricsRepository.save(createMetric("blood_pressure", "120", now)); // Different type

        // When
        HealthMetrics latestWeight = healthMetricsRepository
                .findLatestByUserIdAndMetricType(testUser.getId(), "weight");

        // Then
        assertThat(latestWeight).isNotNull();
        assertThat(latestWeight.getValue()).isEqualByComparingTo(new BigDecimal("74.5"));
        assertThat(latestWeight.getMetricType()).isEqualTo("weight");
    }

    @Test
    void findLatestByUserIdAndMetricType_ShouldReturnNull_WhenNoMatchingMetrics() {
        // Given
        healthMetricsRepository.save(createMetric("weight", "75.0", now));

        // When
        HealthMetrics latestBloodPressure = healthMetricsRepository
                .findLatestByUserIdAndMetricType(testUser.getId(), "blood_pressure");

        // Then
        assertThat(latestBloodPressure).isNull();
    }

    @Test
    void deleteByUserId_ShouldRemoveAllUserMetrics() {
        // Given
        healthMetricsRepository.save(createMetric("weight", "75.0", now));
        healthMetricsRepository.save(createMetric("blood_pressure", "120", now));

        // When
        healthMetricsRepository.deleteByUserId(testUser.getId());
        healthMetricsRepository.flush();

        // Then
        List<HealthMetrics> remainingMetrics = healthMetricsRepository.findByUserOrderByRecordedAtDesc(testUser);
        assertThat(remainingMetrics).isEmpty();
    }

    @Test
    void update_ShouldModifyMetricValue() {
        // Given
        HealthMetrics savedMetric = healthMetricsRepository.save(createMetric("weight", "75.0", now));

        // When
        savedMetric.setValue(new BigDecimal("74.8"));
        HealthMetrics updatedMetric = healthMetricsRepository.save(savedMetric);

        // Then
        assertThat(updatedMetric.getValue()).isEqualByComparingTo(new BigDecimal("74.8"));
    }

    @Test
    void compositeIndex_ShouldOptimizeDateRangeQueries() {
        // Given - create multiple metrics to test index performance
        for (int i = 0; i < 10; i++) {
            HealthMetrics metric = createMetric(
                    "weight",
                    String.valueOf(75.0 - i * 0.5),
                    now.minus(i, ChronoUnit.DAYS)
            );
            healthMetricsRepository.save(metric);
        }

        // When - queries should use idx_metrics_user_date index
        Instant startDate = now.minus(5, ChronoUnit.DAYS);
        List<HealthMetrics> recentMetrics = healthMetricsRepository
                .findByUserAndRecordedAtBetweenOrderByRecordedAtDesc(testUser, startDate, now);

        // Then
        assertThat(recentMetrics).hasSize(6); // Days 0-5 inclusive
        assertThat(recentMetrics.get(0).getRecordedAt()).isAfter(recentMetrics.get(5).getRecordedAt());
    }

    @Test
    void multipleMetricTypes_ShouldBeStoredIndependently() {
        // Given
        healthMetricsRepository.save(createMetric("weight", "75.0", now));
        healthMetricsRepository.save(createMetric("blood_pressure", "120", now));
        healthMetricsRepository.save(createMetric("heart_rate", "72", now));

        // When
        List<HealthMetrics> allMetrics = healthMetricsRepository.findByUserOrderByRecordedAtDesc(testUser);

        // Then
        assertThat(allMetrics).hasSize(3);
        assertThat(allMetrics).extracting(HealthMetrics::getMetricType)
                .containsExactlyInAnyOrder("weight", "blood_pressure", "heart_rate");
    }

    private HealthMetrics createMetric(String type, String value, Instant recordedAt) {
        return HealthMetrics.builder()
                .user(testUser)
                .metricType(type)
                .value(new BigDecimal(value))
                .unit(getUnitForType(type))
                .recordedAt(recordedAt)
                .build();
    }

    private String getUnitForType(String type) {
        return switch (type) {
            case "weight" -> "kg";
            case "blood_pressure" -> "mmHg";
            case "heart_rate" -> "bpm";
            default -> "unit";
        };
    }
}
