package com.healthtracker.backend.repository;

import com.healthtracker.backend.entity.Goal;
import com.healthtracker.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GoalRepository extends JpaRepository<Goal, UUID> {

    /**
     * Find all goals for a specific user.
     * Results are ordered by start date descending (newest first).
     *
     * @param user the user entity
     * @return list of goals
     */
    List<Goal> findByUserOrderByStartDateDesc(User user);

    /**
     * Find goals by user and status.
     * Uses the composite index (user_id, status) for optimal performance.
     * Common status values: "active", "completed", "cancelled"
     *
     * @param user the user entity
     * @param status the goal status
     * @return list of goals with the specified status
     */
    List<Goal> findByUserAndStatusOrderByStartDateDesc(User user, String status);

    /**
     * Find goals by user ID and status.
     * More efficient than loading the User entity first.
     *
     * @param userId the user's UUID
     * @param status the goal status
     * @return list of goals with the specified status
     */
    List<Goal> findByUserIdAndStatusOrderByStartDateDesc(UUID userId, String status);

    /**
     * Find goals by user ID and goal type.
     * Useful for retrieving specific types of goals (e.g., "weight_loss", "steps_daily").
     *
     * @param userId the user's UUID
     * @param goalType the type of goal
     * @return list of goals of the specified type
     */
    List<Goal> findByUserIdAndGoalTypeOrderByStartDateDesc(UUID userId, String goalType);

    /**
     * Count active goals for a user.
     * Used to enforce business rules (e.g., maximum number of active goals).
     *
     * @param userId the user's UUID
     * @param status the goal status (typically "active")
     * @return count of goals with the specified status
     */
    long countByUserIdAndStatus(UUID userId, String status);

    /**
     * Delete all goals for a specific user.
     * Used when a user account is deleted.
     *
     * @param userId the user's UUID
     */
    void deleteByUserId(UUID userId);
}
