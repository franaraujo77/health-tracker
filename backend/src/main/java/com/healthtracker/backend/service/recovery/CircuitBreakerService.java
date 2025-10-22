package com.healthtracker.backend.service.recovery;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Circuit Breaker implementation for protecting external service calls.
 * Implements the Circuit Breaker pattern with three states: CLOSED, OPEN, HALF_OPEN.
 *
 * <p>State transitions:
 * <ul>
 *   <li>CLOSED → OPEN: After threshold failures are reached</li>
 *   <li>OPEN → HALF_OPEN: After timeout period expires</li>
 *   <li>HALF_OPEN → CLOSED: After successful test request</li>
 *   <li>HALF_OPEN → OPEN: If test request fails</li>
 * </ul>
 */
@Slf4j
@Service
public class CircuitBreakerService {

    private final Map<String, CircuitBreaker> circuitBreakers = new ConcurrentHashMap<>();
    private final MeterRegistry meterRegistry;

    private static final int DEFAULT_FAILURE_THRESHOLD = 5;
    private static final long DEFAULT_TIMEOUT_MS = 60000; // 1 minute
    private static final long DEFAULT_HALF_OPEN_SUCCESS_THRESHOLD = 3;

    public CircuitBreakerService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    /**
     * Execute a protected operation with circuit breaker
     */
    public <T> T execute(String serviceName, Supplier<T> operation) throws CircuitBreakerOpenException {
        CircuitBreaker breaker = getOrCreateCircuitBreaker(serviceName);
        return breaker.execute(operation);
    }

    /**
     * Get or create circuit breaker for a service
     */
    private CircuitBreaker getOrCreateCircuitBreaker(String serviceName) {
        return circuitBreakers.computeIfAbsent(serviceName, name ->
                new CircuitBreaker(name, DEFAULT_FAILURE_THRESHOLD, DEFAULT_TIMEOUT_MS,
                        DEFAULT_HALF_OPEN_SUCCESS_THRESHOLD, meterRegistry));
    }

    /**
     * Get circuit breaker state for a service
     */
    public CircuitBreakerState getState(String serviceName) {
        CircuitBreaker breaker = circuitBreakers.get(serviceName);
        return breaker != null ? breaker.getState() : CircuitBreakerState.CLOSED;
    }

    /**
     * Reset circuit breaker to closed state
     */
    public void reset(String serviceName) {
        CircuitBreaker breaker = circuitBreakers.get(serviceName);
        if (breaker != null) {
            breaker.reset();
            log.info("Circuit breaker reset for service: {}", serviceName);
        }
    }

    /**
     * Exception thrown when circuit breaker is open
     */
    public static class CircuitBreakerOpenException extends RuntimeException {
        public CircuitBreakerOpenException(String message) {
            super(message);
        }
    }

    /**
     * Circuit breaker states
     */
    public enum CircuitBreakerState {
        CLOSED,     // Normal operation
        OPEN,       // Blocking all requests
        HALF_OPEN   // Testing if service recovered
    }

    /**
     * Internal circuit breaker implementation
     */
    private static class CircuitBreaker {
        private final String serviceName;
        private final int failureThreshold;
        private final long timeoutMs;
        private final long halfOpenSuccessThreshold;
        private final MeterRegistry meterRegistry;

        private volatile CircuitBreakerState state = CircuitBreakerState.CLOSED;
        private volatile int failureCount = 0;
        private volatile int halfOpenSuccessCount = 0;
        private volatile Instant openedAt;

        private Counter stateChangesCounter;
        private Counter rejectedCallsCounter;

        CircuitBreaker(String serviceName, int failureThreshold, long timeoutMs,
                       long halfOpenSuccessThreshold, MeterRegistry meterRegistry) {
            this.serviceName = serviceName;
            this.failureThreshold = failureThreshold;
            this.timeoutMs = timeoutMs;
            this.halfOpenSuccessThreshold = halfOpenSuccessThreshold;
            this.meterRegistry = meterRegistry;

            initializeMetrics();
        }

        private void initializeMetrics() {
            stateChangesCounter = Counter.builder("circuit_breaker.state_changes")
                    .description("Circuit breaker state transitions")
                    .tag("service", serviceName)
                    .register(meterRegistry);

            rejectedCallsCounter = Counter.builder("circuit_breaker.rejected_calls")
                    .description("Calls rejected by open circuit breaker")
                    .tag("service", serviceName)
                    .register(meterRegistry);
        }

        <T> T execute(Supplier<T> operation) throws CircuitBreakerOpenException {
            synchronized (this) {
                // Check if we should transition from OPEN to HALF_OPEN
                if (state == CircuitBreakerState.OPEN) {
                    if (shouldAttemptReset()) {
                        transitionTo(CircuitBreakerState.HALF_OPEN);
                    } else {
                        rejectedCallsCounter.increment();
                        throw new CircuitBreakerOpenException(
                                "Circuit breaker is OPEN for service: " + serviceName);
                    }
                }

                try {
                    T result = operation.get();
                    onSuccess();
                    return result;
                } catch (Exception e) {
                    onFailure();
                    throw e;
                }
            }
        }

        private void onSuccess() {
            if (state == CircuitBreakerState.HALF_OPEN) {
                halfOpenSuccessCount++;
                if (halfOpenSuccessCount >= halfOpenSuccessThreshold) {
                    reset();
                }
            } else if (state == CircuitBreakerState.CLOSED) {
                failureCount = 0; // Reset failure count on success
            }
        }

        private void onFailure() {
            failureCount++;

            if (state == CircuitBreakerState.HALF_OPEN) {
                // Failure in HALF_OPEN state - go back to OPEN
                transitionTo(CircuitBreakerState.OPEN);
                openedAt = Instant.now();
            } else if (state == CircuitBreakerState.CLOSED && failureCount >= failureThreshold) {
                // Threshold exceeded - open circuit
                transitionTo(CircuitBreakerState.OPEN);
                openedAt = Instant.now();
            }
        }

        private boolean shouldAttemptReset() {
            return openedAt != null &&
                    Instant.now().toEpochMilli() - openedAt.toEpochMilli() >= timeoutMs;
        }

        void reset() {
            transitionTo(CircuitBreakerState.CLOSED);
            failureCount = 0;
            halfOpenSuccessCount = 0;
            openedAt = null;
        }

        private void transitionTo(CircuitBreakerState newState) {
            if (state != newState) {
                log.info("Circuit breaker for {} transitioning from {} to {}",
                        serviceName, state, newState);
                state = newState;
                stateChangesCounter.increment();
            }
        }

        CircuitBreakerState getState() {
            return state;
        }
    }
}
