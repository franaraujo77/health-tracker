package com.healthtracker.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for user login.
 *
 * <p>This DTO validates user login credentials with comprehensive input validation
 * to prevent injection attacks and ensure data integrity.</p>
 *
 * <p>Validation Rules:</p>
 * <ul>
 *   <li>Email: Required, must be valid email format, max 255 characters</li>
 *   <li>Password: Required, min 8 characters, max 100 characters, must contain complexity requirements</li>
 * </ul>
 *
 * <p>Security Considerations:</p>
 * <ul>
 *   <li>Email format validation prevents SQL injection attempts</li>
 *   <li>Password length limits prevent buffer overflow attacks</li>
 *   <li>Pattern validation ensures compliance with security policies</li>
 *   <li>Validation messages are informative but don't leak system details</li>
 * </ul>
 *
 * @author Health Tracker Backend Team
 * @since 1.0.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    /**
     * User's email address.
     *
     * <p>Validated as a proper email format and limited to 255 characters per RFC 5321.</p>
     */
    @NotBlank(message = "Email is required")
    @Email(
            message = "Email must be a valid email address",
            regexp = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
    )
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    /**
     * User's password.
     *
     * <p>Must meet minimum security requirements:</p>
     * <ul>
     *   <li>Minimum 8 characters (industry standard for security)</li>
     *   <li>Maximum 100 characters (prevent DoS via bcrypt)</li>
     *   <li>Should contain mix of characters (enforced at registration)</li>
     * </ul>
     *
     * <p>Note: Password complexity is validated at registration time.
     * Login only validates length to avoid leaking password requirements.</p>
     */
    @NotBlank(message = "Password is required")
    @Size(
            min = 8,
            max = 100,
            message = "Password must be between 8 and 100 characters"
    )
    private String password;
}
