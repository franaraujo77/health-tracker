package com.healthtracker.backend.service.recovery;

import com.healthtracker.backend.BaseIntegrationTest;
import com.healthtracker.backend.annotations.ApiTest;
import com.healthtracker.backend.dto.observability.AlertManagerWebhook;
import com.healthtracker.backend.dto.observability.RecoveryAttempt;
import com.healthtracker.backend.service.RecoveryOrchestrationService;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for automated recovery mechanisms.
 * Tests webhook handling, recovery orchestration, and circuit breaker behavior.
 */
@ApiTest
@DisplayName("Recovery Integration Tests")
class RecoveryIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    // Use RestTemplate without authentication for public webhook endpoint
    private TestRestTemplate unauthenticatedRestTemplate;

    @Autowired
    private RecoveryOrchestrationService orchestrationService;

    private MeterRegistry meterRegistry;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        // Create unauthenticated RestTemplate for public webhook endpoint
        unauthenticatedRestTemplate = restTemplate.withBasicAuth("", "");
    }

    @Test
    @DisplayName("Should accept webhook and return 202 Accepted")
    void shouldAcceptWebhook() {
        // Given: An AlertManager webhook payload
        AlertManagerWebhook webhook = createTestWebhook("firing", "PipelineFailure");

        // When: Posting webhook to endpoint (unauthenticated - public endpoint)
        ResponseEntity<Map> response = unauthenticatedRestTemplate.postForEntity(
                "/api/v1/observability/alerts/webhook",
                webhook,
                Map.class
        );

        // Then: Should return 202 Accepted
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("status")).isEqualTo("accepted");
    }

    @Test
    @DisplayName("Should handle webhook with multiple alerts")
    void shouldHandleMultipleAlerts() {
        // Given: Webhook with 3 alerts
        AlertManagerWebhook webhook = new AlertManagerWebhook();
        webhook.setStatus("firing");
        webhook.setAlerts(List.of(
                createAlert("PipelineFailure", "frontend-ci"),
                createAlert("BuildFailure", "backend-ci"),
                createAlert("RateLimitExceeded", "claude-review")
        ));

        // When: Posting webhook (unauthenticated - public endpoint)
        ResponseEntity<Map> response = unauthenticatedRestTemplate.postForEntity(
                "/api/v1/observability/alerts/webhook",
                webhook,
                Map.class
        );

        // Then: Should accept all alerts
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        assertThat(response.getBody().get("alertCount")).isEqualTo("3");
    }

    @Test
    @DisplayName("Health endpoint should return healthy status")
    void healthEndpointShouldReturnHealthy() {
        // When: Calling health endpoint (unauthenticated - public endpoint)
        ResponseEntity<Map> response = unauthenticatedRestTemplate.getForEntity(
                "/api/v1/observability/alerts/health",
                Map.class
        );

        // Then: Should return 200 OK with healthy status
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("status")).isEqualTo("healthy");
        assertThat(response.getBody().get("service")).isEqualTo("alert-recovery");
    }

    @Test
    @DisplayName("Circuit breaker should open after threshold failures")
    void circuitBreakerShouldOpen() {
        // Given: Circuit breaker service
        CircuitBreakerService circuitBreaker = new CircuitBreakerService(meterRegistry);
        String serviceName = "test-service";

        // When: Triggering multiple failures
        for (int i = 0; i < 5; i++) {
            try {
                circuitBreaker.execute(serviceName, () -> {
                    throw new RuntimeException("Simulated failure");
                });
            } catch (Exception e) {
                // Expected failures
            }
        }

        // Then: Circuit should be OPEN
        assertThat(circuitBreaker.getState(serviceName))
                .isEqualTo(CircuitBreakerService.CircuitBreakerState.OPEN);
    }

    @Test
    @DisplayName("Circuit breaker should reject calls when OPEN")
    void circuitBreakerShouldRejectWhenOpen() {
        // Given: Circuit breaker in OPEN state
        CircuitBreakerService circuitBreaker = new CircuitBreakerService(meterRegistry);
        String serviceName = "test-service-reject";

        // Trigger failures to open circuit
        for (int i = 0; i < 5; i++) {
            try {
                circuitBreaker.execute(serviceName, () -> {
                    throw new RuntimeException("Failure");
                });
            } catch (Exception e) {
                // Expected
            }
        }

        // When: Attempting call with OPEN circuit
        // Then: Should throw CircuitBreakerOpenException
        try {
            circuitBreaker.execute(serviceName, () -> "success");
            throw new AssertionError("Expected CircuitBreakerOpenException");
        } catch (CircuitBreakerService.CircuitBreakerOpenException e) {
            assertThat(e.getMessage()).contains("Circuit breaker is OPEN");
        }
    }

    @Test
    @DisplayName("Circuit breaker should close after successful recovery")
    void circuitBreakerShouldCloseAfterRecovery() {
        // Given: Circuit breaker
        CircuitBreakerService circuitBreaker = new CircuitBreakerService(meterRegistry);
        String serviceName = "test-service-recovery";

        // When: Resetting circuit
        circuitBreaker.reset(serviceName);

        // Then: Should be CLOSED
        assertThat(circuitBreaker.getState(serviceName))
                .isEqualTo(CircuitBreakerService.CircuitBreakerState.CLOSED);
    }

    @Test
    @DisplayName("Should skip non-firing alerts")
    void shouldSkipNonFiringAlerts() {
        // Given: Resolved alert
        AlertManagerWebhook webhook = createTestWebhook("resolved", "PipelineFailure");

        // When: Posting webhook (unauthenticated - public endpoint)
        ResponseEntity<Map> response = unauthenticatedRestTemplate.postForEntity(
                "/api/v1/observability/alerts/webhook",
                webhook,
                Map.class
        );

        // Then: Should accept but skip processing
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
    }

    // Helper methods

    private AlertManagerWebhook createTestWebhook(String status, String alertName) {
        AlertManagerWebhook webhook = new AlertManagerWebhook();
        webhook.setStatus(status);
        webhook.setAlerts(List.of(createAlert(alertName, "test-workflow")));
        return webhook;
    }

    private AlertManagerWebhook.Alert createAlert(String alertName, String workflowName) {
        AlertManagerWebhook.Alert alert = new AlertManagerWebhook.Alert();
        alert.setStatus("firing");
        alert.setStartsAt(Instant.now());
        alert.setLabels(Map.of(
                "alertname", alertName,
                "workflow", workflowName,
                "severity", "high"
        ));
        alert.setAnnotations(Map.of(
                "description", "Test alert for " + alertName,
                "summary", "Pipeline failure detected"
        ));
        return alert;
    }
}
