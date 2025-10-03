package com.healthtracker.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Entity representing revoked/blacklisted JWT tokens.
 *
 * <p>This entity supports token revocation for security purposes:
 * <ul>
 *   <li>Logout functionality - immediately invalidate tokens</li>
 *   <li>Account compromise - revoke all user tokens</li>
 *   <li>Security incidents - mass token revocation</li>
 *   <li>Password changes - invalidate existing sessions</li>
 * </ul>
 *
 * <p><b>Security Design:</b>
 * <ul>
 *   <li>Stores SHA-256 hash of token (not plaintext) for security</li>
 *   <li>Indexed for fast lookup during authentication</li>
 *   <li>Automatic cleanup of expired entries via scheduled job</li>
 *   <li>Includes metadata for audit trail</li>
 * </ul>
 *
 * <p><b>Performance Considerations:</b>
 * Token blacklist checks add latency to authentication. For high-scale deployments:
 * <ul>
 *   <li>Use Redis cache layer for faster lookups</li>
 *   <li>Implement bloom filters for quick negative checks</li>
 *   <li>Regular cleanup prevents table bloat</li>
 * </ul>
 *
 * @author Health Tracker Security Team
 * @see com.healthtracker.backend.security.JwtService
 */
@Entity
@Table(name = "blacklisted_tokens", indexes = {
    @Index(name = "idx_token_hash", columnList = "token_hash"),
    @Index(name = "idx_expires_at", columnList = "expires_at"),
    @Index(name = "idx_user_id", columnList = "user_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BlacklistedToken {

    /**
     * Primary key for the blacklist entry.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * SHA-256 hash of the revoked token.
     *
     * <p>We store the hash instead of the actual token for security:
     * <ul>
     *   <li>Even if database is compromised, tokens cannot be recovered</li>
     *   <li>Complies with secure credential storage practices</li>
     *   <li>64 characters (hex representation of 256-bit hash)</li>
     * </ul>
     */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    /**
     * User ID associated with this token (for audit and bulk revocation).
     */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /**
     * Original token expiration time.
     *
     * <p>Used for automatic cleanup - once a token expires naturally,
     * there's no need to keep it in the blacklist.
     */
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /**
     * Timestamp when the token was blacklisted.
     *
     * <p>Useful for:
     * <ul>
     *   <li>Audit trail - when was token revoked</li>
     *   <li>Security investigations - correlate with incident time</li>
     *   <li>Metrics - track revocation frequency</li>
     * </ul>
     */
    @Column(name = "blacklisted_at", nullable = false)
    private Instant blacklistedAt;

    /**
     * Reason for token revocation (for audit purposes).
     *
     * <p>Examples:
     * <ul>
     *   <li>LOGOUT - User logged out</li>
     *   <li>PASSWORD_CHANGE - User changed password</li>
     *   <li>SECURITY_INCIDENT - Token compromised</li>
     *   <li>ADMIN_REVOCATION - Administrator action</li>
     * </ul>
     */
    @Column(name = "revocation_reason", length = 100)
    private String revocationReason;

    /**
     * IP address from which revocation was initiated (for audit).
     */
    @Column(name = "revoked_from_ip", length = 45)  // IPv6 max length
    private String revokedFromIp;

    /**
     * Creates a new blacklisted token entry with current timestamp.
     *
     * @param tokenHash SHA-256 hash of the token
     * @param userId ID of the user who owns this token
     * @param expiresAt Original token expiration time
     * @param revocationReason Reason for revocation
     * @param revokedFromIp IP address of revocation request
     */
    public BlacklistedToken(String tokenHash, Long userId, Instant expiresAt,
                           String revocationReason, String revokedFromIp) {
        this.tokenHash = tokenHash;
        this.userId = userId;
        this.expiresAt = expiresAt;
        this.blacklistedAt = Instant.now();
        this.revocationReason = revocationReason;
        this.revokedFromIp = revokedFromIp;
    }
}
