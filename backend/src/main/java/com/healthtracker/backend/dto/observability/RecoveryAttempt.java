package com.healthtracker.backend.dto.observability;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * DTO representing an automated recovery attempt.
 * Tracks the lifecycle of recovery actions for auditing and metrics.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecoveryAttempt {

    private String attemptId;
    private String alertName;
    private String severity;
    private String workflowName;
    private String recoveryStrategy;
    private RecoveryStatus status;
    private Instant startedAt;
    private Instant completedAt;
    private String errorMessage;
    private Integer retryCount;
    private String githubRunId;

    public enum RecoveryStatus {
        INITIATED,
        IN_PROGRESS,
        SUCCEEDED,
        FAILED,
        SKIPPED
    }

    /**
     * Calculate recovery duration in milliseconds
     */
    public Long getDurationMs() {
        if (startedAt == null || completedAt == null) {
            return null;
        }
        return completedAt.toEpochMilli() - startedAt.toEpochMilli();
    }

    /**
     * Check if recovery succeeded
     */
    public boolean isSuccessful() {
        return status == RecoveryStatus.SUCCEEDED;
    }
}
