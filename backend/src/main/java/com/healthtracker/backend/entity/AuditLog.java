package com.healthtracker.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Audit log entity for HIPAA compliance
 * Records all PHI access and modifications
 */
@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_user", columnList = "user_id"),
        @Index(name = "idx_audit_timestamp", columnList = "timestamp"),
        @Index(name = "idx_audit_resource", columnList = "resource_type,resource_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 50)
    private String action; // READ, CREATE, UPDATE, DELETE

    @Column(name = "resource_type", nullable = false, length = 100)
    private String resourceType; // HEALTH_METRICS, HEALTH_PROFILE, GOAL, USER

    @Column(name = "resource_id")
    private UUID resourceId;

    @Column(nullable = false, updatable = false)
    private Instant timestamp;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(columnDefinition = "TEXT")
    private String details; // Additional context (JSON)

    @PrePersist
    protected void onCreate() {
        timestamp = Instant.now();
    }
}
