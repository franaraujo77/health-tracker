package com.healthtracker.backend.service;

import com.healthtracker.backend.entity.Goal;
import com.healthtracker.backend.entity.User;
import com.healthtracker.backend.repository.GoalRepository;
import com.healthtracker.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GoalServiceTest {

    @Mock
    private GoalRepository goalRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private GoalService goalService;

    private User testUser;
    private Goal testGoal;
    private UUID userId;
    private UUID goalId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        goalId = UUID.randomUUID();

        testUser = User.builder()
                .id(userId)
                .email("test@example.com")
                .build();

        testGoal = Goal.builder()
                .id(goalId)
                .user(testUser)
                .goalType("weight_loss")
                .targetValue(new BigDecimal("75.0"))
                .currentValue(new BigDecimal("80.0"))
                .startDate(LocalDate.now())
                .status("active")
                .build();
    }

    @Test
    void createGoal_ShouldCreateGoal_WhenUserExistsAndUnderLimit() {
        // Given
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(goalRepository.countByUserIdAndStatus(userId, "active")).thenReturn(5L);
        when(goalRepository.save(any(Goal.class))).thenReturn(testGoal);

        // When
        Goal createdGoal = goalService.createGoal(userId, testGoal);

        // Then
        assertThat(createdGoal).isNotNull();
        assertThat(createdGoal.getGoalType()).isEqualTo("weight_loss");
        verify(userRepository).findById(userId);
        verify(goalRepository).countByUserIdAndStatus(userId, "active");
        verify(goalRepository).save(any(Goal.class));
    }

    @Test
    void createGoal_ShouldThrowException_WhenMaxActiveGoalsReached() {
        // Given
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(goalRepository.countByUserIdAndStatus(userId, "active")).thenReturn(10L);

        // When & Then
        assertThatThrownBy(() -> goalService.createGoal(userId, testGoal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Maximum active goals");

        verify(userRepository).findById(userId);
        verify(goalRepository).countByUserIdAndStatus(userId, "active");
        verify(goalRepository, never()).save(any(Goal.class));
    }

    @Test
    void getUserGoals_ShouldReturnGoals_WhenUserExists() {
        // Given
        List<Goal> goals = Arrays.asList(testGoal);
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(goalRepository.findByUserOrderByStartDateDesc(testUser)).thenReturn(goals);

        // When
        List<Goal> result = goalService.getUserGoals(userId);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getGoalType()).isEqualTo("weight_loss");
        verify(userRepository).findById(userId);
        verify(goalRepository).findByUserOrderByStartDateDesc(testUser);
    }

    @Test
    void updateGoalProgress_ShouldUpdateProgress_WhenGoalExists() {
        // Given
        BigDecimal newValue = new BigDecimal("78.0");
        when(goalRepository.findById(goalId)).thenReturn(Optional.of(testGoal));
        when(goalRepository.save(any(Goal.class))).thenReturn(testGoal);

        // When
        Goal updatedGoal = goalService.updateGoalProgress(goalId, newValue);

        // Then
        assertThat(updatedGoal).isNotNull();
        verify(goalRepository).findById(goalId);
        verify(goalRepository).save(any(Goal.class));
    }

    @Test
    void updateGoalProgress_ShouldAutoComplete_WhenTargetReached() {
        // Given
        BigDecimal targetValue = new BigDecimal("75.0");
        when(goalRepository.findById(goalId)).thenReturn(Optional.of(testGoal));
        when(goalRepository.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Goal updatedGoal = goalService.updateGoalProgress(goalId, targetValue);

        // Then
        verify(goalRepository).findById(goalId);
        verify(goalRepository).save(argThat(goal ->
            "completed".equals(goal.getStatus())
        ));
    }

    @Test
    void deleteGoal_ShouldDeleteGoal_WhenGoalExists() {
        // Given
        when(goalRepository.existsById(goalId)).thenReturn(true);

        // When
        goalService.deleteGoal(goalId);

        // Then
        verify(goalRepository).existsById(goalId);
        verify(goalRepository).deleteById(goalId);
    }

    @Test
    void countActiveGoals_ShouldReturnCount() {
        // Given
        when(goalRepository.countByUserIdAndStatus(userId, "active")).thenReturn(7L);

        // When
        long count = goalService.countActiveGoals(userId);

        // Then
        assertThat(count).isEqualTo(7L);
        verify(goalRepository).countByUserIdAndStatus(userId, "active");
    }
}
