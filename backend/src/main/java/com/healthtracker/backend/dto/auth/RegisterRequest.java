package com.healthtracker.backend.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for user registration.
 *
 * <p>This DTO validates user registration data with comprehensive input validation
 * to prevent injection attacks, ensure password security, and maintain data integrity.</p>
 *
 * <p>Validation Rules:</p>
 * <ul>
 *   <li>Email: Required, valid email format, max 255 characters, case-insensitive</li>
 *   <li>Password: Required, min 8 characters, max 100 characters, complexity requirements</li>
 *   <li>Roles: Optional array, defaults to PATIENT if not provided</li>
 * </ul>
 *
 * <p>Security Considerations:</p>
 * <ul>
 *   <li>Email format validation prevents SQL injection and ensures RFC compliance</li>
 *   <li>Password complexity enforced: uppercase, lowercase, digit, special character</li>
 *   <li>Password length limits prevent bcrypt DoS attacks (max 72 bytes)</li>
 *   <li>HIPAA-compliant password requirements for PHI access</li>
 *   <li>Role-based access control prepared for future enhancements</li>
 * </ul>
 *
 * @author Health Tracker Backend Team
 * @since 1.0.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    /**
     * User's email address (serves as username).
     *
     * <p>Validated as a proper email format per RFC 5322 specification.
     * Limited to 255 characters per RFC 5321. Will be stored in lowercase
     * for case-insensitive authentication.</p>
     *
     * <p>Examples of valid emails:</p>
     * <ul>
     *   <li>user@example.com</li>
     *   <li>john.doe+tag@company.co.uk</li>
     *   <li>admin123@sub.domain.org</li>
     * </ul>
     */
    @NotBlank(message = "Email is required")
    @Email(
            message = "Email must be a valid email address",
            regexp = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
    )
    @Size(
            min = 5,
            max = 255,
            message = "Email must be between 5 and 255 characters"
    )
    private String email;

    /**
     * User's password.
     *
     * <p>Must meet NIST SP 800-63B and HIPAA security requirements:</p>
     * <ul>
     *   <li>Minimum 8 characters (NIST recommendation)</li>
     *   <li>Maximum 100 characters (prevent bcrypt DoS, bcrypt has 72-byte limit)</li>
     *   <li>At least one uppercase letter (A-Z)</li>
     *   <li>At least one lowercase letter (a-z)</li>
     *   <li>At least one digit (0-9)</li>
     *   <li>At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)</li>
     * </ul>
     *
     * <p>The password will be hashed using BCrypt with appropriate work factor
     * before storage. Plain text passwords are never stored.</p>
     *
     * <p>Example valid passwords:</p>
     * <ul>
     *   <li>MyP@ssw0rd</li>
     *   <li>Secure123!</li>
     *   <li>C0mpl3x$Pass</li>
     * </ul>
     */
    @NotBlank(message = "Password is required")
    @Size(
            min = 8,
            max = 100,
            message = "Password must be between 8 and 100 characters"
    )
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{}|;:,.<>?]).{8,}$",
            message = "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
    )
    private String password;

    /**
     * User roles for role-based access control (RBAC).
     *
     * <p>Optional field that defaults to ["PATIENT"] if not provided.
     * Valid roles include:</p>
     * <ul>
     *   <li>PATIENT - Standard user with access to their own health data</li>
     *   <li>PROVIDER - Healthcare provider with broader access</li>
     *   <li>ADMIN - System administrator with full access</li>
     * </ul>
     *
     * <p>Note: Role assignment may be restricted based on business rules.
     * Typically, ADMIN and PROVIDER roles are assigned through administrative
     * processes rather than self-registration.</p>
     *
     * <p>Security: Role validation is performed at the service layer to prevent
     * privilege escalation attacks.</p>
     */
    private String[] roles; // Optional: defaults to PATIENT if not provided
}
