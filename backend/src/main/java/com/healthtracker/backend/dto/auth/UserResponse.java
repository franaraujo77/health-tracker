package com.healthtracker.backend.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO containing user profile information
 * Used by the /auth/me endpoint to return current user details
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private UUID id;
    private String email;
    private String[] roles;
    private Instant createdAt;
    private Instant updatedAt;
}
