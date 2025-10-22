package com.healthtracker.backend.service;

import com.healthtracker.backend.dto.observability.AlertManagerWebhook;
import com.healthtracker.backend.dto.observability.RecoveryAttempt;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Orchestrates automated recovery for pipeline failures.
 * Routes alerts to appropriate recovery handlers and tracks success metrics.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecoveryOrchestrationService {

    private final Map<String, RecoveryHandler> recoveryHandlers = new ConcurrentHashMap<>();
    private final MeterRegistry meterRegistry;

    // Metrics
    private Counter recoveryAttemptsTotal;
    private Counter recoverySuccessTotal;
    private Counter recoveryFailureTotal;
    private Timer recoveryDurationTimer;

    /**
     * Register a recovery handler for a specific alert type
     */
    public void registerHandler(String alertName, RecoveryHandler handler) {
        recoveryHandlers.put(alertName, handler);
        log.info("Registered recovery handler for alert: {}", alertName);
    }

    /**
     * Process incoming AlertManager webhook asynchronously
     */
    @Async
    public void processAlert(AlertManagerWebhook webhook) {
        if (webhook.getAlerts() == null || webhook.getAlerts().isEmpty()) {
            log.warn("Received empty alert webhook");
            return;
        }

        for (AlertManagerWebhook.Alert alert : webhook.getAlerts()) {
            // Only process firing alerts
            if (!"firing".equalsIgnoreCase(alert.getStatus())) {
                log.debug("Skipping non-firing alert: {}", alert.getAlertName());
                continue;
            }

            processAlert(alert);
        }
    }

    /**
     * Process a single alert and attempt recovery
     */
    private void processAlert(AlertManagerWebhook.Alert alert) {
        String alertName = alert.getAlertName();
        RecoveryAttempt attempt = RecoveryAttempt.builder()
                .attemptId(UUID.randomUUID().toString())
                .alertName(alertName)
                .severity(alert.getSeverity())
                .workflowName(alert.getWorkflowName())
                .status(RecoveryAttempt.RecoveryStatus.INITIATED)
                .startedAt(Instant.now())
                .retryCount(0)
                .build();

        log.info("Processing alert: {} for workflow: {}", alertName, alert.getWorkflowName());

        // Increment attempts counter
        getRecoveryAttemptsCounter().increment();

        RecoveryHandler handler = recoveryHandlers.get(alertName);
        if (handler == null) {
            log.warn("No recovery handler registered for alert: {}", alertName);
            attempt.setStatus(RecoveryAttempt.RecoveryStatus.SKIPPED);
            attempt.setCompletedAt(Instant.now());
            return;
        }

        // Execute recovery with timing
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            attempt.setStatus(RecoveryAttempt.RecoveryStatus.IN_PROGRESS);
            attempt.setRecoveryStrategy(handler.getStrategyName());

            boolean success = handler.attemptRecovery(alert, attempt);

            attempt.setStatus(success ?
                    RecoveryAttempt.RecoveryStatus.SUCCEEDED :
                    RecoveryAttempt.RecoveryStatus.FAILED);
            attempt.setCompletedAt(Instant.now());

            // Record metrics
            if (success) {
                getRecoverySuccessCounter().increment();
                log.info("Recovery succeeded for alert: {} in {}ms",
                        alertName, attempt.getDurationMs());
            } else {
                getRecoveryFailureCounter().increment();
                log.warn("Recovery failed for alert: {}", alertName);
            }

        } catch (Exception e) {
            attempt.setStatus(RecoveryAttempt.RecoveryStatus.FAILED);
            attempt.setErrorMessage(e.getMessage());
            attempt.setCompletedAt(Instant.now());
            getRecoveryFailureCounter().increment();

            log.error("Recovery attempt failed with exception for alert: {}", alertName, e);
        } finally {
            sample.stop(getRecoveryDurationTimer());
        }

        // Log recovery attempt for audit
        logRecoveryAttempt(attempt);
    }

    /**
     * Log recovery attempt to structured logs (picked up by Loki)
     */
    private void logRecoveryAttempt(RecoveryAttempt attempt) {
        log.info("Recovery attempt completed: alertName={}, status={}, duration={}ms, strategy={}",
                attempt.getAlertName(),
                attempt.getStatus(),
                attempt.getDurationMs(),
                attempt.getRecoveryStrategy());
    }

    // Lazy metric initialization
    private Counter getRecoveryAttemptsCounter() {
        if (recoveryAttemptsTotal == null) {
            recoveryAttemptsTotal = Counter.builder("recovery.attempts.total")
                    .description("Total number of automated recovery attempts")
                    .register(meterRegistry);
        }
        return recoveryAttemptsTotal;
    }

    private Counter getRecoverySuccessCounter() {
        if (recoverySuccessTotal == null) {
            recoverySuccessTotal = Counter.builder("recovery.success.total")
                    .description("Total number of successful recoveries")
                    .register(meterRegistry);
        }
        return recoverySuccessTotal;
    }

    private Counter getRecoveryFailureCounter() {
        if (recoveryFailureTotal == null) {
            recoveryFailureTotal = Counter.builder("recovery.failure.total")
                    .description("Total number of failed recoveries")
                    .register(meterRegistry);
        }
        return recoveryFailureTotal;
    }

    private Timer getRecoveryDurationTimer() {
        if (recoveryDurationTimer == null) {
            recoveryDurationTimer = Timer.builder("recovery.duration.seconds")
                    .description("Duration of recovery attempts")
                    .register(meterRegistry);
        }
        return recoveryDurationTimer;
    }

    /**
     * Interface for recovery handlers
     */
    public interface RecoveryHandler {
        String getStrategyName();
        boolean attemptRecovery(AlertManagerWebhook.Alert alert, RecoveryAttempt attempt);
    }
}
