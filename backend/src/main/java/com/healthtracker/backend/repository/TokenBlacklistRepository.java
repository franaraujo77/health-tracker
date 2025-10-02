package com.healthtracker.backend.repository;

import com.healthtracker.backend.entity.BlacklistedToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

/**
 * Repository for managing blacklisted JWT tokens.
 *
 * <p>Provides fast lookups for token revocation checks during authentication.
 * Uses indexed queries for optimal performance.
 *
 * <p><b>Performance Optimization:</b>
 * <ul>
 *   <li>Token hash lookups use unique index (O(log n))</li>
 *   <li>Cleanup queries use expiration index</li>
 *   <li>Bulk operations supported for mass revocation</li>
 * </ul>
 *
 * @author Health Tracker Security Team
 * @see BlacklistedToken
 * @see com.healthtracker.backend.security.JwtService
 */
@Repository
public interface TokenBlacklistRepository extends JpaRepository<BlacklistedToken, Long> {

    /**
     * Checks if a token hash exists in the blacklist.
     *
     * <p>This is the primary method called during every authentication request.
     * Performance is critical - uses unique index on token_hash column.
     *
     * @param tokenHash SHA-256 hash of the token to check
     * @return true if token is blacklisted, false otherwise
     */
    boolean existsByTokenHash(String tokenHash);

    /**
     * Finds all blacklisted tokens for a specific user.
     *
     * <p>Useful for:
     * <ul>
     *   <li>Displaying active sessions to user</li>
     *   <li>Bulk revocation on password change</li>
     *   <li>Security audits</li>
     * </ul>
     *
     * @param userId ID of the user
     * @return list of blacklisted tokens for this user
     */
    List<BlacklistedToken> findByUserId(Long userId);

    /**
     * Deletes all expired blacklisted tokens.
     *
     * <p>Should be called periodically (e.g., daily scheduled job) to prevent
     * table bloat. Tokens that have naturally expired don't need to be checked
     * anymore.
     *
     * <p><b>Usage Example:</b>
     * <pre>
     * {@code
     * @Scheduled(cron = "0 0 2 * * *")  // Daily at 2 AM
     * public void cleanupExpiredTokens() {
     *     int deleted = tokenBlacklistRepository.deleteExpiredTokens(Instant.now());
     *     log.info("Cleaned up {} expired blacklisted tokens", deleted);
     * }
     * }
     * </pre>
     *
     * @param now current timestamp
     * @return number of tokens deleted
     */
    @Modifying
    @Query("DELETE FROM BlacklistedToken bt WHERE bt.expiresAt < :now")
    int deleteExpiredTokens(@Param("now") Instant now);

    /**
     * Counts how many tokens are currently blacklisted for a user.
     *
     * <p>Useful for:
     * <ul>
     *   <li>Displaying "active sessions" count</li>
     *   <li>Security alerts (e.g., unusual number of sessions)</li>
     *   <li>Rate limiting logout operations</li>
     * </ul>
     *
     * @param userId ID of the user
     * @return count of active blacklisted tokens
     */
    @Query("SELECT COUNT(bt) FROM BlacklistedToken bt WHERE bt.userId = :userId AND bt.expiresAt > :now")
    long countActiveBlacklistedTokensByUserId(@Param("userId") Long userId, @Param("now") Instant now);

    /**
     * Finds recently blacklisted tokens for security monitoring.
     *
     * <p>Used for detecting suspicious activity:
     * <ul>
     *   <li>Mass token revocations (potential breach)</li>
     *   <li>Unusual revocation patterns</li>
     *   <li>Security dashboards</li>
     * </ul>
     *
     * @param since timestamp to search from
     * @return list of recently blacklisted tokens
     */
    @Query("SELECT bt FROM BlacklistedToken bt WHERE bt.blacklistedAt >= :since ORDER BY bt.blacklistedAt DESC")
    List<BlacklistedToken> findRecentlyBlacklisted(@Param("since") Instant since);

    /**
     * Revokes all tokens for a user (bulk operation).
     *
     * <p>Used when:
     * <ul>
     *   <li>User changes password - invalidate all sessions</li>
     *   <li>Account compromised - immediately revoke access</li>
     *   <li>Admin action - force logout all user sessions</li>
     * </ul>
     *
     * <p><b>Note:</b> This doesn't actually blacklist tokens, just counts them.
     * Use this with {@link #findByUserId(Long)} to get tokens to blacklist.
     *
     * @param userId ID of the user
     * @return count of user's tokens that will need blacklisting
     */
    @Query("SELECT COUNT(bt) FROM BlacklistedToken bt WHERE bt.userId = :userId")
    long countByUserId(@Param("userId") Long userId);
}
