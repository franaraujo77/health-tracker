package com.healthtracker.backend.service;

import com.healthtracker.backend.entity.User;
import com.healthtracker.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private User testUser;
    private UUID testUserId;

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
        testUser = User.builder()
                .id(testUserId)
                .email("test@example.com")
                .passwordHash("hashedPassword")
                .roles(new String[]{"USER"})
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    void createUser_ShouldCreateUser_WhenEmailIsUnique() {
        // Given
        when(userRepository.existsByEmail(testUser.getEmail())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // When
        User createdUser = userService.createUser(testUser);

        // Then
        assertThat(createdUser).isNotNull();
        assertThat(createdUser.getEmail()).isEqualTo("test@example.com");
        verify(userRepository).existsByEmail(testUser.getEmail());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void createUser_ShouldThrowException_WhenEmailExists() {
        // Given
        when(userRepository.existsByEmail(testUser.getEmail())).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> userService.createUser(testUser))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email already registered");

        verify(userRepository).existsByEmail(testUser.getEmail());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void findById_ShouldReturnUser_WhenUserExists() {
        // Given
        when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));

        // When
        Optional<User> foundUser = userService.findById(testUserId);

        // Then
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getId()).isEqualTo(testUserId);
        verify(userRepository).findById(testUserId);
    }

    @Test
    void findByEmail_ShouldReturnUser_WhenUserExists() {
        // Given
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));

        // When
        Optional<User> foundUser = userService.findByEmail(testUser.getEmail());

        // Then
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getEmail()).isEqualTo(testUser.getEmail());
        verify(userRepository).findByEmail(testUser.getEmail());
    }

    @Test
    void updateUser_ShouldUpdateUser_WhenUserExists() {
        // Given
        User updatedData = User.builder()
                .email("newemail@example.com")
                .passwordHash("newHashedPassword")
                .build();

        when(userRepository.findById(testUserId)).thenReturn(Optional.of(testUser));
        when(userRepository.existsByEmail(updatedData.getEmail())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // When
        User updatedUser = userService.updateUser(testUserId, updatedData);

        // Then
        assertThat(updatedUser).isNotNull();
        verify(userRepository).findById(testUserId);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void updateUser_ShouldThrowException_WhenUserNotFound() {
        // Given
        when(userRepository.findById(testUserId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> userService.updateUser(testUserId, testUser))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("User not found");

        verify(userRepository).findById(testUserId);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void deleteUser_ShouldDeleteUser_WhenUserExists() {
        // Given
        when(userRepository.existsById(testUserId)).thenReturn(true);

        // When
        userService.deleteUser(testUserId);

        // Then
        verify(userRepository).existsById(testUserId);
        verify(userRepository).deleteById(testUserId);
    }

    @Test
    void deleteUser_ShouldThrowException_WhenUserNotFound() {
        // Given
        when(userRepository.existsById(testUserId)).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> userService.deleteUser(testUserId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("User not found");

        verify(userRepository).existsById(testUserId);
        verify(userRepository, never()).deleteById(any(UUID.class));
    }

    @Test
    void emailExists_ShouldReturnTrue_WhenEmailExists() {
        // Given
        when(userRepository.existsByEmail(testUser.getEmail())).thenReturn(true);

        // When
        boolean exists = userService.emailExists(testUser.getEmail());

        // Then
        assertThat(exists).isTrue();
        verify(userRepository).existsByEmail(testUser.getEmail());
    }
}
