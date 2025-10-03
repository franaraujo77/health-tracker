package com.healthtracker.backend.controller;

import com.healthtracker.backend.entity.HealthProfile;
import com.healthtracker.backend.service.HealthProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/health-profile")
@RequiredArgsConstructor
@Slf4j
public class HealthProfileController {

    private final HealthProfileService healthProfileService;

    /**
     * Get current user's health profile.
     */
    @GetMapping
    public ResponseEntity<HealthProfile> getHealthProfile(@RequestHeader("X-User-Id") UUID userId) {
        log.info("GET /api/v1/health-profile - userId: {}", userId);
        return healthProfileService.getHealthProfile(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Create or update current user's health profile.
     */
    @PutMapping
    public ResponseEntity<HealthProfile> saveHealthProfile(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody HealthProfile healthProfile) {
        log.info("PUT /api/v1/health-profile - userId: {}", userId);
        try {
            HealthProfile savedProfile = healthProfileService.saveHealthProfile(userId, healthProfile);
            boolean isNew = !healthProfileService.hasHealthProfile(userId);
            HttpStatus status = isNew ? HttpStatus.CREATED : HttpStatus.OK;
            return ResponseEntity.status(status).body(savedProfile);
        } catch (IllegalArgumentException e) {
            log.warn("Health profile save failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Delete current user's health profile.
     */
    @DeleteMapping
    public ResponseEntity<Void> deleteHealthProfile(@RequestHeader("X-User-Id") UUID userId) {
        log.info("DELETE /api/v1/health-profile - userId: {}", userId);
        healthProfileService.deleteHealthProfile(userId);
        return ResponseEntity.noContent().build();
    }
}
