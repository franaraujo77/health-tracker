package com.healthtracker.backend.service;

import com.healthtracker.backend.entity.User;
import com.healthtracker.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;

    /**
     * Create a new user account.
     * Validates that email is unique before creating.
     *
     * @param user the user entity to create
     * @return the created user with generated ID
     * @throws IllegalArgumentException if email already exists
     */
    @Transactional
    public User createUser(User user) {
        log.info("Creating new user with email: {}", user.getEmail());

        if (userRepository.existsByEmail(user.getEmail())) {
            log.warn("User creation failed - email already exists: {}", user.getEmail());
            throw new IllegalArgumentException("Email already registered: " + user.getEmail());
        }

        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());

        User savedUser = userRepository.save(user);
        log.info("User created successfully with ID: {}", savedUser.getId());
        return savedUser;
    }

    /**
     * Find a user by ID.
     *
     * @param userId the user's UUID
     * @return Optional containing the user if found
     */
    @Transactional(readOnly = true)
    public Optional<User> findById(UUID userId) {
        log.debug("Finding user by ID: {}", userId);
        return userRepository.findById(userId);
    }

    /**
     * Find a user by email address.
     * Primarily used for authentication.
     *
     * @param email the user's email
     * @return Optional containing the user if found
     */
    @Transactional(readOnly = true)
    public Optional<User> findByEmail(String email) {
        log.debug("Finding user by email: {}", email);
        return userRepository.findByEmail(email);
    }

    /**
     * Get all users in the system.
     * Should be restricted to admin users only.
     *
     * @return list of all users
     */
    @Transactional(readOnly = true)
    public List<User> findAllUsers() {
        log.debug("Finding all users");
        return userRepository.findAll();
    }

    /**
     * Update an existing user.
     * Email cannot be changed to an email that's already in use.
     *
     * @param userId the user's UUID
     * @param updatedUser the user entity with updated fields
     * @return the updated user
     * @throws IllegalArgumentException if user not found or email conflict
     */
    @Transactional
    public User updateUser(UUID userId, User updatedUser) {
        log.info("Updating user with ID: {}", userId);

        User existingUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        // Check if email is being changed and if new email is available
        if (!existingUser.getEmail().equals(updatedUser.getEmail())) {
            if (userRepository.existsByEmail(updatedUser.getEmail())) {
                log.warn("User update failed - email already exists: {}", updatedUser.getEmail());
                throw new IllegalArgumentException("Email already in use: " + updatedUser.getEmail());
            }
            existingUser.setEmail(updatedUser.getEmail());
        }

        // Update other fields
        if (updatedUser.getPasswordHash() != null) {
            existingUser.setPasswordHash(updatedUser.getPasswordHash());
        }
        if (updatedUser.getRoles() != null) {
            existingUser.setRoles(updatedUser.getRoles());
        }

        existingUser.setUpdatedAt(Instant.now());

        User savedUser = userRepository.save(existingUser);
        log.info("User updated successfully: {}", userId);
        return savedUser;
    }

    /**
     * Delete a user account.
     * This will cascade delete all associated health data (profile, metrics, goals).
     *
     * @param userId the user's UUID
     * @throws IllegalArgumentException if user not found
     */
    @Transactional
    public void deleteUser(UUID userId) {
        log.info("Deleting user with ID: {}", userId);

        if (!userRepository.existsById(userId)) {
            log.warn("User deletion failed - user not found: {}", userId);
            throw new IllegalArgumentException("User not found: " + userId);
        }

        userRepository.deleteById(userId);
        log.info("User deleted successfully: {}", userId);
    }

    /**
     * Check if a user exists by ID.
     *
     * @param userId the user's UUID
     * @return true if user exists
     */
    @Transactional(readOnly = true)
    public boolean existsById(UUID userId) {
        return userRepository.existsById(userId);
    }

    /**
     * Check if an email is already registered.
     *
     * @param email the email to check
     * @return true if email exists
     */
    @Transactional(readOnly = true)
    public boolean emailExists(String email) {
        return userRepository.existsByEmail(email);
    }
}
