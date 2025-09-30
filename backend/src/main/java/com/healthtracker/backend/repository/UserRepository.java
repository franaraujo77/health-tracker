package com.healthtracker.backend.repository;

import com.healthtracker.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Find a user by their email address.
     * Used for authentication and duplicate email validation.
     *
     * @param email the user's email address
     * @return Optional containing the user if found
     */
    Optional<User> findByEmail(String email);

    /**
     * Check if a user exists with the given email.
     * Useful for registration validation without loading the full entity.
     *
     * @param email the email to check
     * @return true if user exists
     */
    boolean existsByEmail(String email);
}
