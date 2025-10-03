package com.healthtracker.backend.controller;

import com.healthtracker.backend.entity.Goal;
import com.healthtracker.backend.service.GoalService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/goals")
@RequiredArgsConstructor
@Slf4j
public class GoalController {

    private final GoalService goalService;

    /**
     * Get all goals for current user.
     * Supports optional filtering by status or type.
     */
    @GetMapping
    public ResponseEntity<List<Goal>> getGoals(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type) {

        log.info("GET /api/v1/goals - userId: {}, status: {}, type: {}", userId, status, type);

        try {
            List<Goal> goals;

            if (status != null && !status.isEmpty()) {
                goals = goalService.getUserGoalsByStatus(userId, status);
            } else if (type != null && !type.isEmpty()) {
                goals = goalService.getUserGoalsByType(userId, type);
            } else {
                goals = goalService.getUserGoals(userId);
            }

            return ResponseEntity.ok(goals);
        } catch (IllegalArgumentException e) {
            log.warn("Get goals failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get a specific goal by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Goal> getGoal(@PathVariable UUID id) {
        log.info("GET /api/v1/goals/{}", id);

        return goalService.getGoalById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Create a new goal.
     */
    @PostMapping
    public ResponseEntity<Goal> createGoal(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody Goal goal) {

        log.info("POST /api/v1/goals - userId: {}, type: {}", userId, goal.getGoalType());

        try {
            Goal createdGoal = goalService.createGoal(userId, goal);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdGoal);
        } catch (IllegalArgumentException e) {
            log.warn("Create goal failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Update a goal's details.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Goal> updateGoal(
            @PathVariable UUID id,
            @RequestBody Goal goal) {

        log.info("PUT /api/v1/goals/{}", id);

        try {
            Goal updatedGoal = goalService.updateGoal(id, goal);
            return ResponseEntity.ok(updatedGoal);
        } catch (IllegalArgumentException e) {
            log.warn("Update goal failed: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Update goal progress.
     */
    @PatchMapping("/{id}/progress")
    public ResponseEntity<Goal> updateGoalProgress(
            @PathVariable UUID id,
            @RequestParam BigDecimal currentValue) {

        log.info("PATCH /api/v1/goals/{}/progress - currentValue: {}", id, currentValue);

        try {
            Goal updatedGoal = goalService.updateGoalProgress(id, currentValue);
            return ResponseEntity.ok(updatedGoal);
        } catch (IllegalArgumentException e) {
            log.warn("Update goal progress failed: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete a goal.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGoal(@PathVariable UUID id) {
        log.info("DELETE /api/v1/goals/{}", id);

        try {
            goalService.deleteGoal(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.warn("Delete goal failed: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get count of active goals for current user.
     */
    @GetMapping("/active/count")
    public ResponseEntity<Long> getActiveGoalsCount(@RequestHeader("X-User-Id") UUID userId) {
        log.info("GET /api/v1/goals/active/count - userId: {}", userId);
        long count = goalService.countActiveGoals(userId);
        return ResponseEntity.ok(count);
    }
}
