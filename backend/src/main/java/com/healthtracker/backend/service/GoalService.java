package com.healthtracker.backend.service;

import com.healthtracker.backend.entity.Goal;
import com.healthtracker.backend.entity.User;
import com.healthtracker.backend.repository.GoalRepository;
import com.healthtracker.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoalService {

    private final GoalRepository goalRepository;
    private final UserRepository userRepository;

    private static final int MAX_ACTIVE_GOALS = 10;

    /**
     * Create a new goal for a user.
     * Enforces a maximum of 10 active goals per user.
     *
     * @param userId the user's UUID
     * @param goal the goal to create
     * @return the saved goal
     * @throws IllegalArgumentException if user not found or max active goals exceeded
     */
    @Transactional
    public Goal createGoal(UUID userId, Goal goal) {
        log.info("Creating goal for user: {} - type: {}", userId, goal.getGoalType());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        // Check if user has reached max active goals
        long activeGoalsCount = goalRepository.countByUserIdAndStatus(userId, "active");
        if (activeGoalsCount >= MAX_ACTIVE_GOALS) {
            log.warn("Goal creation failed - max active goals reached for user: {}", userId);
            throw new IllegalArgumentException(
                    "Maximum active goals (" + MAX_ACTIVE_GOALS + ") reached. Complete or cancel existing goals first."
            );
        }

        goal.setUser(user);

        // Set default values if not provided
        if (goal.getStartDate() == null) {
            goal.setStartDate(LocalDate.now());
        }
        if (goal.getStatus() == null) {
            goal.setStatus("active");
        }
        if (goal.getCurrentValue() == null) {
            goal.setCurrentValue(BigDecimal.ZERO);
        }

        Goal savedGoal = goalRepository.save(goal);
        log.info("Goal created with ID: {}", savedGoal.getId());
        return savedGoal;
    }

    /**
     * Get all goals for a user.
     * Results ordered by start date descending (newest first).
     *
     * @param userId the user's UUID
     * @return list of goals
     * @throws IllegalArgumentException if user not found
     */
    @Transactional(readOnly = true)
    public List<Goal> getUserGoals(UUID userId) {
        log.debug("Retrieving all goals for user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        return goalRepository.findByUserOrderByStartDateDesc(user);
    }

    /**
     * Get goals by status for a user.
     * Common status values: "active", "completed", "cancelled"
     *
     * @param userId the user's UUID
     * @param status the goal status
     * @return list of goals with the specified status
     */
    @Transactional(readOnly = true)
    public List<Goal> getUserGoalsByStatus(UUID userId, String status) {
        log.debug("Retrieving goals for user: {} with status: {}", userId, status);
        return goalRepository.findByUserIdAndStatusOrderByStartDateDesc(userId, status);
    }

    /**
     * Get goals by type for a user.
     *
     * @param userId the user's UUID
     * @param goalType the type of goal (e.g., "weight_loss", "steps_daily")
     * @return list of goals of the specified type
     */
    @Transactional(readOnly = true)
    public List<Goal> getUserGoalsByType(UUID userId, String goalType) {
        log.debug("Retrieving goals for user: {} of type: {}", userId, goalType);
        return goalRepository.findByUserIdAndGoalTypeOrderByStartDateDesc(userId, goalType);
    }

    /**
     * Get a specific goal by ID.
     *
     * @param goalId the goal's UUID
     * @return Optional containing the goal if found
     */
    @Transactional(readOnly = true)
    public Optional<Goal> getGoalById(UUID goalId) {
        log.debug("Retrieving goal by ID: {}", goalId);
        return goalRepository.findById(goalId);
    }

    /**
     * Update a goal's progress.
     * Automatically updates status to "completed" if target is reached.
     *
     * @param goalId the goal's UUID
     * @param currentValue the new current value
     * @return the updated goal
     * @throws IllegalArgumentException if goal not found
     */
    @Transactional
    public Goal updateGoalProgress(UUID goalId, BigDecimal currentValue) {
        log.info("Updating progress for goal: {} to value: {}", goalId, currentValue);

        Goal goal = goalRepository.findById(goalId)
                .orElseThrow(() -> new IllegalArgumentException("Goal not found: " + goalId));

        goal.setCurrentValue(currentValue);

        // Auto-complete goal if target is reached
        if (goal.getTargetValue() != null &&
            currentValue.compareTo(goal.getTargetValue()) >= 0 &&
            "active".equals(goal.getStatus())) {
            goal.setStatus("completed");
            log.info("Goal automatically marked as completed: {}", goalId);
        }

        Goal savedGoal = goalRepository.save(goal);
        log.info("Goal progress updated: {}", goalId);
        return savedGoal;
    }

    /**
     * Update a goal's details.
     *
     * @param goalId the goal's UUID
     * @param updatedGoal the updated goal data
     * @return the updated goal
     * @throws IllegalArgumentException if goal not found
     */
    @Transactional
    public Goal updateGoal(UUID goalId, Goal updatedGoal) {
        log.info("Updating goal: {}", goalId);

        Goal existingGoal = goalRepository.findById(goalId)
                .orElseThrow(() -> new IllegalArgumentException("Goal not found: " + goalId));

        existingGoal.setGoalType(updatedGoal.getGoalType());
        existingGoal.setTargetValue(updatedGoal.getTargetValue());
        existingGoal.setCurrentValue(updatedGoal.getCurrentValue());
        existingGoal.setStartDate(updatedGoal.getStartDate());
        existingGoal.setEndDate(updatedGoal.getEndDate());
        existingGoal.setStatus(updatedGoal.getStatus());

        Goal savedGoal = goalRepository.save(existingGoal);
        log.info("Goal updated: {}", goalId);
        return savedGoal;
    }

    /**
     * Delete a goal.
     *
     * @param goalId the goal's UUID
     * @throws IllegalArgumentException if goal not found
     */
    @Transactional
    public void deleteGoal(UUID goalId) {
        log.info("Deleting goal: {}", goalId);

        if (!goalRepository.existsById(goalId)) {
            throw new IllegalArgumentException("Goal not found: " + goalId);
        }

        goalRepository.deleteById(goalId);
        log.info("Goal deleted: {}", goalId);
    }

    /**
     * Delete all goals for a user.
     *
     * @param userId the user's UUID
     */
    @Transactional
    public void deleteAllUserGoals(UUID userId) {
        log.info("Deleting all goals for user: {}", userId);
        goalRepository.deleteByUserId(userId);
        log.info("All goals deleted for user: {}", userId);
    }

    /**
     * Get count of active goals for a user.
     *
     * @param userId the user's UUID
     * @return count of active goals
     */
    @Transactional(readOnly = true)
    public long countActiveGoals(UUID userId) {
        return goalRepository.countByUserIdAndStatus(userId, "active");
    }
}
