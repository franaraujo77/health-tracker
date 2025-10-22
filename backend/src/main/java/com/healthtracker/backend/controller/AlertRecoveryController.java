package com.healthtracker.backend.controller;

import com.healthtracker.backend.dto.observability.AlertManagerWebhook;
import com.healthtracker.backend.service.RecoveryOrchestrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for receiving AlertManager webhooks and triggering automated recovery.
 * This endpoint is called by AlertManager when alerts fire, initiating self-healing workflows.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/observability/alerts")
@RequiredArgsConstructor
@Tag(name = "Alert Recovery", description = "Automated recovery for pipeline failures")
public class AlertRecoveryController {

    private final RecoveryOrchestrationService recoveryOrchestrationService;

    /**
     * Webhook endpoint for AlertManager notifications.
     * Receives alert payloads and triggers appropriate recovery mechanisms.
     *
     * @param webhook The AlertManager webhook payload
     * @return 202 Accepted if webhook is processed successfully
     */
    @PostMapping("/webhook")
    @Operation(
            summary = "Receive AlertManager webhooks",
            description = "Endpoint for AlertManager to send alert notifications for automated recovery"
    )
    @ApiResponse(responseCode = "202", description = "Webhook accepted for processing")
    @ApiResponse(responseCode = "400", description = "Invalid webhook payload")
    @ApiResponse(responseCode = "500", description = "Internal server error")
    public ResponseEntity<Map<String, String>> receiveWebhook(@RequestBody AlertManagerWebhook webhook) {
        try {
            log.info("Received AlertManager webhook: status={}, alerts={}",
                    webhook.getStatus(), webhook.getAlerts().size());

            // Process webhook asynchronously
            recoveryOrchestrationService.processAlert(webhook);

            return ResponseEntity.accepted()
                    .body(Map.of(
                            "status", "accepted",
                            "message", "Webhook received and queued for processing",
                            "alertCount", String.valueOf(webhook.getAlerts().size())
                    ));

        } catch (Exception e) {
            log.error("Error processing AlertManager webhook", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "status", "error",
                            "message", "Failed to process webhook: " + e.getMessage()
                    ));
        }
    }

    /**
     * Health check endpoint for webhook receiver
     */
    @GetMapping("/health")
    @Operation(
            summary = "Health check for recovery service",
            description = "Verify that the alert recovery service is operational"
    )
    @ApiResponse(responseCode = "200", description = "Service is healthy")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "healthy",
                "service", "alert-recovery"
        ));
    }
}
