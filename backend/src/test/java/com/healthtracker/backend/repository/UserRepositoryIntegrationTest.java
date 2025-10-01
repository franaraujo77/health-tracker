package com.healthtracker.backend.repository;

import com.healthtracker.backend.BaseIntegrationTest;
import com.healthtracker.backend.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for UserRepository using Testcontainers PostgreSQL.
 * Tests real database interactions without mocks.
 */
@Transactional
class UserRepositoryIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        testUser = User.builder()
                .email("integration@test.com")
                .passwordHash("hashedPassword123")
                .roles(new String[]{"USER"})
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    void save_ShouldPersistUser_ToDatabase() {
        // When
        User savedUser = userRepository.save(testUser);

        // Then
        assertThat(savedUser.getId()).isNotNull();
        assertThat(savedUser.getEmail()).isEqualTo("integration@test.com");
        assertThat(savedUser.getPasswordHash()).isEqualTo("hashedPassword123");
        assertThat(savedUser.getRoles()).containsExactly("USER");
    }

    @Test
    void findById_ShouldReturnUser_WhenUserExists() {
        // Given
        User savedUser = userRepository.save(testUser);

        // When
        Optional<User> foundUser = userRepository.findById(savedUser.getId());

        // Then
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getEmail()).isEqualTo("integration@test.com");
    }

    @Test
    void findById_ShouldReturnEmpty_WhenUserDoesNotExist() {
        // When
        Optional<User> foundUser = userRepository.findById(java.util.UUID.randomUUID());

        // Then
        assertThat(foundUser).isEmpty();
    }

    @Test
    void findByEmail_ShouldReturnUser_WhenEmailExists() {
        // Given
        userRepository.save(testUser);

        // When
        Optional<User> foundUser = userRepository.findByEmail("integration@test.com");

        // Then
        assertThat(foundUser).isPresent();
        assertThat(foundUser.get().getEmail()).isEqualTo("integration@test.com");
    }

    @Test
    void findByEmail_ShouldReturnEmpty_WhenEmailDoesNotExist() {
        // When
        Optional<User> foundUser = userRepository.findByEmail("nonexistent@test.com");

        // Then
        assertThat(foundUser).isEmpty();
    }

    @Test
    void existsByEmail_ShouldReturnTrue_WhenEmailExists() {
        // Given
        userRepository.save(testUser);

        // When
        boolean exists = userRepository.existsByEmail("integration@test.com");

        // Then
        assertThat(exists).isTrue();
    }

    @Test
    void existsByEmail_ShouldReturnFalse_WhenEmailDoesNotExist() {
        // When
        boolean exists = userRepository.existsByEmail("nonexistent@test.com");

        // Then
        assertThat(exists).isFalse();
    }

    @Test
    void delete_ShouldRemoveUser_FromDatabase() {
        // Given
        User savedUser = userRepository.save(testUser);

        // When
        userRepository.delete(savedUser);

        // Then
        Optional<User> foundUser = userRepository.findById(savedUser.getId());
        assertThat(foundUser).isEmpty();
    }

    @Test
    void update_ShouldModifyUser_InDatabase() {
        // Given
        User savedUser = userRepository.save(testUser);

        // When
        savedUser.setEmail("updated@test.com");
        savedUser.setUpdatedAt(Instant.now());
        User updatedUser = userRepository.save(savedUser);

        // Then
        assertThat(updatedUser.getEmail()).isEqualTo("updated@test.com");
        assertThat(updatedUser.getUpdatedAt()).isAfter(updatedUser.getCreatedAt());
    }

    @Test
    void count_ShouldReturnCorrectCount() {
        // Given
        userRepository.save(testUser);

        User anotherUser = User.builder()
                .email("another@test.com")
                .passwordHash("hash456")
                .roles(new String[]{"USER"})
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        userRepository.save(anotherUser);

        // When
        long count = userRepository.count();

        // Then
        assertThat(count).isEqualTo(2);
    }
}
