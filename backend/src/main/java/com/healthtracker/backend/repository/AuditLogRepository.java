package com.healthtracker.backend.repository;

import com.healthtracker.backend.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Repository for audit log operations
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    /**
     * Find audit logs by user ID
     */
    List<AuditLog> findByUserIdOrderByTimestampDesc(UUID userId);

    /**
     * Find audit logs by resource
     */
    List<AuditLog> findByResourceTypeAndResourceIdOrderByTimestampDesc(
            String resourceType,
            UUID resourceId
    );

    /**
     * Find audit logs within time range
     */
    List<AuditLog> findByTimestampBetweenOrderByTimestampDesc(
            Instant startTime,
            Instant endTime
    );
}
