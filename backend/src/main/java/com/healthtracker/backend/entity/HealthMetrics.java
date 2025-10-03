package com.healthtracker.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "health_metrics", indexes = {
    @Index(name = "idx_metrics_user_date", columnList = "user_id, recorded_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthMetrics {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "metric_type", nullable = false, length = 50)
    private String metricType;

    @Column(precision = 10, scale = 2)
    private BigDecimal value;

    @Column(length = 20)
    private String unit;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;

    @Column(length = 50)
    private String source;

    @PrePersist
    protected void onCreate() {
        if (recordedAt == null) {
            recordedAt = Instant.now();
        }
    }
}
