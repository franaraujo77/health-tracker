package com.healthtracker.backend.repository;

import com.healthtracker.backend.entity.HealthProfile;
import com.healthtracker.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface HealthProfileRepository extends JpaRepository<HealthProfile, UUID> {

    /**
     * Find a health profile by the associated user.
     * Each user has exactly one health profile (OneToOne relationship).
     *
     * @param user the user entity
     * @return Optional containing the health profile if found
     */
    Optional<HealthProfile> findByUser(User user);

    /**
     * Find a health profile by user ID.
     * More efficient than loading the User entity first.
     *
     * @param userId the user's UUID
     * @return Optional containing the health profile if found
     */
    Optional<HealthProfile> findByUserId(UUID userId);

    /**
     * Delete a health profile by user ID.
     * Used when a user account is deleted.
     *
     * @param userId the user's UUID
     */
    void deleteByUserId(UUID userId);
}
