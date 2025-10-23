package com.healthtracker.backend.service.recovery;

import com.healthtracker.backend.dto.observability.AlertManagerWebhook;
import com.healthtracker.backend.dto.observability.RecoveryAttempt;
import com.healthtracker.backend.service.RecoveryOrchestrationService.RecoveryHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * Recovery handler for rate limit exceeded errors.
 * Implements exponential backoff retry strategy.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitRecoveryHandler implements RecoveryHandler {

    private final GitHubWorkflowRetryHandler workflowRetryHandler;

    private static final int MAX_RETRIES = 3;
    private static final long INITIAL_BACKOFF_MS = 1000; // 1 second
    private static final int BACKOFF_MULTIPLIER = 2;

    @Override
    public String getStrategyName() {
        return "rate-limit-backoff";
    }

    @Override
    public boolean attemptRecovery(AlertManagerWebhook.Alert alert, RecoveryAttempt attempt) {
        String errorMessage = alert.getErrorMessage();
        if (errorMessage == null || !isRateLimitError(errorMessage)) {
            log.debug("Not a rate limit error, skipping rate limit handler");
            return false;
        }

        log.info("Detected rate limit error, applying exponential backoff retry strategy");

        for (int retryCount = 0; retryCount < MAX_RETRIES; retryCount++) {
            long backoffMs = calculateBackoff(retryCount);

            try {
                log.info("Retry attempt {} after {}ms backoff", retryCount + 1, backoffMs);

                // Wait for backoff period
                Thread.sleep(backoffMs);

                // Attempt workflow retry after backoff
                attempt.setRetryCount(retryCount + 1);
                boolean success = workflowRetryHandler.attemptRecovery(alert, attempt);

                if (success) {
                    log.info("Rate limit recovery succeeded after {} retries", retryCount + 1);
                    return true;
                }

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.error("Rate limit recovery interrupted", e);
                return false;
            }
        }

        log.warn("Rate limit recovery failed after {} retries", MAX_RETRIES);
        return false;
    }

    /**
     * Calculate exponential backoff duration
     */
    private long calculateBackoff(int retryCount) {
        return INITIAL_BACKOFF_MS * (long) Math.pow(BACKOFF_MULTIPLIER, retryCount);
    }

    /**
     * Check if error message indicates rate limiting
     */
    private boolean isRateLimitError(String errorMessage) {
        String lowerCaseMessage = errorMessage.toLowerCase();
        return lowerCaseMessage.contains("rate limit") ||
                lowerCaseMessage.contains("429") ||
                lowerCaseMessage.contains("too many requests") ||
                lowerCaseMessage.contains("throttled");
    }
}
