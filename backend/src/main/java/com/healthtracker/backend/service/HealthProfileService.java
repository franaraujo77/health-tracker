package com.healthtracker.backend.service;

import com.healthtracker.backend.entity.HealthProfile;
import com.healthtracker.backend.entity.User;
import com.healthtracker.backend.repository.HealthProfileRepository;
import com.healthtracker.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class HealthProfileService {

    private final HealthProfileRepository healthProfileRepository;
    private final UserRepository userRepository;

    /**
     * Create or update a health profile for a user.
     * Each user can only have one health profile (OneToOne relationship).
     *
     * @param userId the user's UUID
     * @param healthProfile the health profile data
     * @return the saved health profile
     * @throws IllegalArgumentException if user not found
     */
    @Transactional
    public HealthProfile saveHealthProfile(UUID userId, HealthProfile healthProfile) {
        log.info("Saving health profile for user: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        // Check if profile already exists
        Optional<HealthProfile> existingProfile = healthProfileRepository.findByUserId(userId);

        if (existingProfile.isPresent()) {
            // Update existing profile
            HealthProfile profile = existingProfile.get();
            profile.setDateOfBirth(healthProfile.getDateOfBirth());
            profile.setGender(healthProfile.getGender());
            profile.setHeightCm(healthProfile.getHeightCm());
            profile.setMedicalHistoryEncrypted(healthProfile.getMedicalHistoryEncrypted());

            HealthProfile savedProfile = healthProfileRepository.save(profile);
            log.info("Health profile updated for user: {}", userId);
            return savedProfile;
        } else {
            // Create new profile
            healthProfile.setUser(user);
            HealthProfile savedProfile = healthProfileRepository.save(healthProfile);
            log.info("Health profile created for user: {}", userId);
            return savedProfile;
        }
    }

    /**
     * Get a user's health profile.
     *
     * @param userId the user's UUID
     * @return Optional containing the health profile if it exists
     */
    @Transactional(readOnly = true)
    public Optional<HealthProfile> getHealthProfile(UUID userId) {
        log.debug("Retrieving health profile for user: {}", userId);
        return healthProfileRepository.findByUserId(userId);
    }

    /**
     * Delete a user's health profile.
     *
     * @param userId the user's UUID
     */
    @Transactional
    public void deleteHealthProfile(UUID userId) {
        log.info("Deleting health profile for user: {}", userId);
        healthProfileRepository.deleteByUserId(userId);
        log.info("Health profile deleted for user: {}", userId);
    }

    /**
     * Check if a user has a health profile.
     *
     * @param userId the user's UUID
     * @return true if health profile exists
     */
    @Transactional(readOnly = true)
    public boolean hasHealthProfile(UUID userId) {
        return healthProfileRepository.findByUserId(userId).isPresent();
    }
}
