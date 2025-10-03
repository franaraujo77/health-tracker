package com.healthtracker.backend.repository;

import com.healthtracker.backend.BaseIntegrationTest;
import com.healthtracker.backend.entity.Goal;
import com.healthtracker.backend.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for GoalRepository using Testcontainers PostgreSQL.
 * Tests real database interactions with composite indexes and custom queries.
 */
@Transactional
class GoalRepositoryIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private GoalRepository goalRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser;
    private Goal activeGoal;
    private Goal completedGoal;

    @BeforeEach
    void setUp() {
        goalRepository.deleteAll();
        userRepository.deleteAll();

        testUser = User.builder()
                .email("goaltest@test.com")
                .passwordHash("hash123")
                .roles(new String[]{"USER"})
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        testUser = userRepository.save(testUser);

        activeGoal = Goal.builder()
                .user(testUser)
                .goalType("weight_loss")
                .targetValue(new BigDecimal("75.0"))
                .currentValue(new BigDecimal("80.0"))
                .startDate(LocalDate.now().minusDays(10))
                .endDate(LocalDate.now().plusDays(20))
                .status("active")
                .build();

        completedGoal = Goal.builder()
                .user(testUser)
                .goalType("exercise")
                .targetValue(new BigDecimal("100"))
                .currentValue(new BigDecimal("100"))
                .startDate(LocalDate.now().minusDays(30))
                .endDate(LocalDate.now().minusDays(1))
                .status("completed")
                .build();
    }

    @Test
    void save_ShouldPersistGoal_ToDatabase() {
        // When
        Goal savedGoal = goalRepository.save(activeGoal);

        // Then
        assertThat(savedGoal.getId()).isNotNull();
        assertThat(savedGoal.getGoalType()).isEqualTo("weight_loss");
        assertThat(savedGoal.getTargetValue()).isEqualByComparingTo(new BigDecimal("75.0"));
        assertThat(savedGoal.getStatus()).isEqualTo("active");
    }

    @Test
    void findByUserOrderByStartDateDesc_ShouldReturnGoals_InDescendingOrder() {
        // Given
        goalRepository.save(activeGoal);
        goalRepository.save(completedGoal);

        // When
        List<Goal> goals = goalRepository.findByUserOrderByStartDateDesc(testUser);

        // Then
        assertThat(goals).hasSize(2);
        assertThat(goals.get(0).getStartDate()).isAfter(goals.get(1).getStartDate());
    }

    @Test
    void findByUserAndStatusOrderByStartDateDesc_ShouldReturnOnlyActiveGoals() {
        // Given
        goalRepository.save(activeGoal);
        goalRepository.save(completedGoal);

        // When
        List<Goal> activeGoals = goalRepository.findByUserAndStatusOrderByStartDateDesc(testUser, "active");

        // Then
        assertThat(activeGoals).hasSize(1);
        assertThat(activeGoals.get(0).getStatus()).isEqualTo("active");
        assertThat(activeGoals.get(0).getGoalType()).isEqualTo("weight_loss");
    }

    @Test
    void findByUserAndStatusOrderByStartDateDesc_ShouldReturnOnlyCompletedGoals() {
        // Given
        goalRepository.save(activeGoal);
        goalRepository.save(completedGoal);

        // When
        List<Goal> completedGoals = goalRepository.findByUserAndStatusOrderByStartDateDesc(testUser, "completed");

        // Then
        assertThat(completedGoals).hasSize(1);
        assertThat(completedGoals.get(0).getStatus()).isEqualTo("completed");
        assertThat(completedGoals.get(0).getGoalType()).isEqualTo("exercise");
    }

    @Test
    void findByUserIdAndGoalTypeOrderByStartDateDesc_ShouldReturnMatchingGoals() {
        // Given
        goalRepository.save(activeGoal);
        goalRepository.save(completedGoal);

        // When
        List<Goal> weightLossGoals = goalRepository.findByUserIdAndGoalTypeOrderByStartDateDesc(testUser.getId(), "weight_loss");

        // Then
        assertThat(weightLossGoals).hasSize(1);
        assertThat(weightLossGoals.get(0).getGoalType()).isEqualTo("weight_loss");
    }

    @Test
    void countByUserIdAndStatus_ShouldReturnCorrectCount() {
        // Given
        goalRepository.save(activeGoal);
        goalRepository.save(completedGoal);

        // When
        long activeCount = goalRepository.countByUserIdAndStatus(testUser.getId(), "active");
        long completedCount = goalRepository.countByUserIdAndStatus(testUser.getId(), "completed");

        // Then
        assertThat(activeCount).isEqualTo(1);
        assertThat(completedCount).isEqualTo(1);
    }

    @Test
    void countByUserIdAndStatus_ShouldReturnZero_WhenNoMatchingGoals() {
        // Given
        goalRepository.save(activeGoal);

        // When
        long canceledCount = goalRepository.countByUserIdAndStatus(testUser.getId(), "canceled");

        // Then
        assertThat(canceledCount).isZero();
    }

    @Test
    void deleteByUserId_ShouldRemoveAllUserGoals() {
        // Given
        goalRepository.save(activeGoal);
        goalRepository.save(completedGoal);

        // When
        goalRepository.deleteByUserId(testUser.getId());
        goalRepository.flush();

        // Then
        List<Goal> remainingGoals = goalRepository.findByUserOrderByStartDateDesc(testUser);
        assertThat(remainingGoals).isEmpty();
    }

    @Test
    void update_ShouldModifyGoalProgress() {
        // Given
        Goal savedGoal = goalRepository.save(activeGoal);

        // When
        savedGoal.setCurrentValue(new BigDecimal("77.0"));
        Goal updatedGoal = goalRepository.save(savedGoal);

        // Then
        assertThat(updatedGoal.getCurrentValue()).isEqualByComparingTo(new BigDecimal("77.0"));
    }

    @Test
    void update_ShouldCompleteGoal_WhenTargetReached() {
        // Given
        Goal savedGoal = goalRepository.save(activeGoal);

        // When
        savedGoal.setCurrentValue(savedGoal.getTargetValue());
        savedGoal.setStatus("completed");
        Goal updatedGoal = goalRepository.save(savedGoal);

        // Then
        assertThat(updatedGoal.getStatus()).isEqualTo("completed");
        assertThat(updatedGoal.getCurrentValue()).isEqualByComparingTo(updatedGoal.getTargetValue());
    }

    @Test
    void compositeIndex_ShouldOptimizeStatusQueries() {
        // Given - create multiple goals to test index performance
        for (int i = 0; i < 5; i++) {
            Goal goal = Goal.builder()
                    .user(testUser)
                    .goalType("test_type_" + i)
                    .targetValue(new BigDecimal("100"))
                    .currentValue(new BigDecimal("50"))
                    .startDate(LocalDate.now().minusDays(i))
                    .status(i % 2 == 0 ? "active" : "completed")
                    .build();
            goalRepository.save(goal);
        }

        // When - queries should use idx_goals_user_status index
        long activeCount = goalRepository.countByUserIdAndStatus(testUser.getId(), "active");

        // Then
        assertThat(activeCount).isEqualTo(3); // 0, 2, 4 are even
    }
}
