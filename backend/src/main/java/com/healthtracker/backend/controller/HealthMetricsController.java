package com.healthtracker.backend.controller;

import com.healthtracker.backend.entity.HealthMetrics;
import com.healthtracker.backend.service.HealthMetricsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/health-metrics")
@RequiredArgsConstructor
@Slf4j
public class HealthMetricsController {

    private final HealthMetricsService healthMetricsService;

    /**
     * Get all health metrics for current user.
     * Supports optional filtering by metric type and date range.
     */
    @GetMapping
    public ResponseEntity<List<HealthMetrics>> getHealthMetrics(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {

        log.info("GET /api/v1/health-metrics - userId: {}, type: {}, from: {}, to: {}",
                userId, type, from, to);

        try {
            List<HealthMetrics> metrics;

            if (type != null && !type.isEmpty()) {
                metrics = healthMetricsService.getUserMetricsByType(userId, type);
            } else if (from != null && to != null) {
                metrics = healthMetricsService.getUserMetricsByDateRange(userId, from, to);
            } else {
                metrics = healthMetricsService.getUserMetrics(userId);
            }

            return ResponseEntity.ok(metrics);
        } catch (IllegalArgumentException e) {
            log.warn("Get health metrics failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get the latest health metric of a specific type.
     */
    @GetMapping("/latest")
    public ResponseEntity<HealthMetrics> getLatestMetric(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestParam String type) {

        log.info("GET /api/v1/health-metrics/latest - userId: {}, type: {}", userId, type);

        return healthMetricsService.getLatestMetricByType(userId, type)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Record a new health metric.
     */
    @PostMapping
    public ResponseEntity<HealthMetrics> recordMetric(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody HealthMetrics healthMetrics) {

        log.info("POST /api/v1/health-metrics - userId: {}, type: {}",
                userId, healthMetrics.getMetricType());

        try {
            HealthMetrics savedMetric = healthMetricsService.recordMetric(userId, healthMetrics);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedMetric);
        } catch (IllegalArgumentException e) {
            log.warn("Record health metric failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Update an existing health metric.
     */
    @PutMapping("/{id}")
    public ResponseEntity<HealthMetrics> updateMetric(
            @PathVariable UUID id,
            @RequestBody HealthMetrics healthMetrics) {

        log.info("PUT /api/v1/health-metrics/{} - type: {}", id, healthMetrics.getMetricType());

        try {
            HealthMetrics updatedMetric = healthMetricsService.updateMetric(id, healthMetrics);
            return ResponseEntity.ok(updatedMetric);
        } catch (IllegalArgumentException e) {
            log.warn("Update health metric failed: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete a health metric.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMetric(@PathVariable UUID id) {
        log.info("DELETE /api/v1/health-metrics/{}", id);

        try {
            healthMetricsService.deleteMetric(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.warn("Delete health metric failed: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
}
