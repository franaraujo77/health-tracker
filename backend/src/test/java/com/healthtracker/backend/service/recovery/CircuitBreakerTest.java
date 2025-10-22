package com.healthtracker.backend.service.recovery;

import com.healthtracker.backend.service.recovery.CircuitBreakerService.CircuitBreakerOpenException;
import com.healthtracker.backend.service.recovery.CircuitBreakerService.CircuitBreakerState;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for Circuit Breaker functionality.
 * Tests state transitions and failure handling without Spring context.
 */
@DisplayName("Circuit Breaker Tests")
class CircuitBreakerTest {

    private CircuitBreakerService circuitBreakerService;

    @BeforeEach
    void setUp() {
        circuitBreakerService = new CircuitBreakerService(new SimpleMeterRegistry());
    }

    @Test
    @DisplayName("Should start in CLOSED state")
    void shouldStartClosed() {
        // When: Checking initial state
        CircuitBreakerState state = circuitBreakerService.getState("test-service");

        // Then: Should be CLOSED
        assertThat(state).isEqualTo(CircuitBreakerState.CLOSED);
    }

    @Test
    @DisplayName("Should execute successfully in CLOSED state")
    void shouldExecuteInClosedState() throws Exception {
        // When: Executing operation
        String result = circuitBreakerService.execute("test-service", () -> "success");

        // Then: Should return result
        assertThat(result).isEqualTo("success");
    }

    @Test
    @DisplayName("Should transition to OPEN after threshold failures")
    void shouldTransitionToOpen() {
        // Given: Service name
        String serviceName = "failing-service";

        // When: Triggering 5 failures (default threshold)
        for (int i = 0; i < 5; i++) {
            try {
                circuitBreakerService.execute(serviceName, () -> {
                    throw new RuntimeException("Simulated failure");
                });
            } catch (Exception e) {
                // Expected failures
            }
        }

        // Then: Circuit should be OPEN
        assertThat(circuitBreakerService.getState(serviceName))
                .isEqualTo(CircuitBreakerState.OPEN);
    }

    @Test
    @DisplayName("Should reject calls when OPEN")
    void shouldRejectWhenOpen() {
        // Given: Circuit breaker in OPEN state
        String serviceName = "test-reject";

        // Trigger failures to open circuit
        for (int i = 0; i < 5; i++) {
            try {
                circuitBreakerService.execute(serviceName, () -> {
                    throw new RuntimeException("Failure");
                });
            } catch (Exception e) {
                // Expected
            }
        }

        // When/Then: Attempting call with OPEN circuit should throw exception
        assertThatThrownBy(() -> circuitBreakerService.execute(serviceName, () -> "success"))
                .isInstanceOf(CircuitBreakerOpenException.class)
                .hasMessageContaining("Circuit breaker is OPEN");
    }

    @Test
    @DisplayName("Should reset to CLOSED state")
    void shouldReset() {
        // Given: Circuit breaker in OPEN state
        String serviceName = "test-reset";

        for (int i = 0; i < 5; i++) {
            try {
                circuitBreakerService.execute(serviceName, () -> {
                    throw new RuntimeException("Failure");
                });
            } catch (Exception e) {
                // Expected
            }
        }

        assertThat(circuitBreakerService.getState(serviceName))
                .isEqualTo(CircuitBreakerState.OPEN);

        // When: Resetting circuit
        circuitBreakerService.reset(serviceName);

        // Then: Should be CLOSED
        assertThat(circuitBreakerService.getState(serviceName))
                .isEqualTo(CircuitBreakerState.CLOSED);
    }

    @Test
    @DisplayName("Should handle multiple services independently")
    void shouldHandleMultipleServices() throws Exception {
        // Given: Two services
        String service1 = "service-1";
        String service2 = "service-2";

        // When: Service 1 fails but service 2 succeeds
        for (int i = 0; i < 5; i++) {
            try {
                circuitBreakerService.execute(service1, () -> {
                    throw new RuntimeException("Failure");
                });
            } catch (Exception e) {
                // Expected
            }
        }

        String result = circuitBreakerService.execute(service2, () -> "success");

        // Then: Service 1 should be OPEN, service 2 should be CLOSED
        assertThat(circuitBreakerService.getState(service1))
                .isEqualTo(CircuitBreakerState.OPEN);
        assertThat(circuitBreakerService.getState(service2))
                .isEqualTo(CircuitBreakerState.CLOSED);
        assertThat(result).isEqualTo("success");
    }
}
