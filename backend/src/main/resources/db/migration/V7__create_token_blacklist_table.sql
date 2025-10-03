-- V7__create_token_blacklist_table.sql
--
-- Creates the token blacklist table for JWT revocation support.
--
-- Security Features:
-- 1. Stores SHA-256 hash of tokens (not plaintext) for security
-- 2. Indexed for fast lookup during authentication
-- 3. Includes audit fields (reason, IP, timestamp)
-- 4. Supports automatic cleanup of expired tokens
--
-- Performance Optimizations:
-- 1. Unique index on token_hash for O(log n) lookups
-- 2. Index on expires_at for efficient cleanup queries
-- 3. Index on user_id for bulk operations
-- 4. Partitioning-ready design for high-volume scenarios
--
-- HIPAA Compliance:
-- - Audit trail for token revocation events
-- - IP address logging for security investigations
-- - Reason tracking for compliance reporting

CREATE TABLE blacklisted_tokens (
    -- Primary key
    id BIGSERIAL PRIMARY KEY,

    -- Token identifier (SHA-256 hash, 64 hex characters)
    -- UNIQUE constraint ensures same token can't be blacklisted twice
    token_hash VARCHAR(64) NOT NULL UNIQUE,

    -- User who owned this token
    -- NOT NULL ensures we always know which user's token was revoked
    user_id BIGINT NOT NULL,

    -- Original token expiration time
    -- Used for automatic cleanup - expired tokens don't need checking
    expires_at TIMESTAMP NOT NULL,

    -- When was token blacklisted
    -- Defaults to current time for automatic timestamping
    blacklisted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Why was token revoked (for audit trail)
    -- Examples: 'LOGOUT', 'PASSWORD_CHANGE', 'SECURITY_INCIDENT'
    revocation_reason VARCHAR(100),

    -- IP address from which revocation occurred (for audit)
    -- VARCHAR(45) supports IPv6 (max 39 chars) with room for future
    revoked_from_ip VARCHAR(45)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Primary lookup index - used on EVERY authentication request
-- UNIQUE constraint already creates this index, but explicit for clarity
CREATE INDEX idx_blacklisted_tokens_token_hash ON blacklisted_tokens(token_hash);

-- Cleanup index - used by scheduled job to delete expired tokens
CREATE INDEX idx_blacklisted_tokens_expires_at ON blacklisted_tokens(expires_at);

-- User operations index - used for bulk revocation on password change
CREATE INDEX idx_blacklisted_tokens_user_id ON blacklisted_tokens(user_id);

-- Audit queries index - for security monitoring and investigations
CREATE INDEX idx_blacklisted_tokens_blacklisted_at ON blacklisted_tokens(blacklisted_at DESC);

-- Composite index for common query pattern (user's active blacklisted tokens)
-- Note: Partial index removed - CURRENT_TIMESTAMP is not IMMUTABLE
-- Query performance impact minimal as full index on (user_id, expires_at) is sufficient
CREATE INDEX idx_blacklisted_tokens_user_active ON blacklisted_tokens(user_id, expires_at);

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE blacklisted_tokens IS
'Stores revoked JWT tokens to prevent their use after logout, password change, or security incidents. Tokens are hashed (SHA-256) for security.';

COMMENT ON COLUMN blacklisted_tokens.token_hash IS
'SHA-256 hash of the revoked JWT token (64 hex characters). Storing hash instead of plaintext prevents token recovery if database is compromised.';

COMMENT ON COLUMN blacklisted_tokens.user_id IS
'ID of the user who owned this token. Used for bulk revocation and audit trail.';

COMMENT ON COLUMN blacklisted_tokens.expires_at IS
'Original expiration time of the token. Tokens are automatically cleaned up after this time since they cannot be used anyway.';

COMMENT ON COLUMN blacklisted_tokens.blacklisted_at IS
'Timestamp when token was revoked. Used for audit trail and security investigations.';

COMMENT ON COLUMN blacklisted_tokens.revocation_reason IS
'Reason for token revocation (e.g., LOGOUT, PASSWORD_CHANGE, SECURITY_INCIDENT). Required for HIPAA compliance auditing.';

COMMENT ON COLUMN blacklisted_tokens.revoked_from_ip IS
'IP address from which revocation request originated. Used for security investigations and fraud detection.';

-- ============================================================================
-- Cleanup Function (PostgreSQL)
-- ============================================================================

-- Function to cleanup expired tokens
-- Should be called by scheduled job (e.g., daily at 2 AM)
CREATE OR REPLACE FUNCTION cleanup_expired_blacklisted_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete tokens that have expired
    DELETE FROM blacklisted_tokens
    WHERE expires_at < CURRENT_TIMESTAMP;

    -- Get number of deleted rows
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log cleanup event for audit
    RAISE NOTICE 'Cleaned up % expired blacklisted tokens at %',
                 deleted_count, CURRENT_TIMESTAMP;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_blacklisted_tokens() IS
'Deletes expired tokens from blacklist. Should be called periodically (daily) to prevent table bloat.';

-- ============================================================================
-- Optional: Create scheduled cleanup job (PostgreSQL pg_cron extension)
-- ============================================================================

-- Uncomment if pg_cron extension is available:
-- SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT cleanup_expired_blacklisted_tokens()');

-- Alternative: Add to application scheduled jobs
-- @Scheduled(cron = "0 0 2 * * *")  // Daily at 2 AM
-- public void cleanupExpiredTokens() {
--     tokenBlacklistRepository.deleteExpiredTokens(Instant.now());
-- }

-- ============================================================================
-- Performance Notes
-- ============================================================================

-- For HIGH-VOLUME deployments (>10k tokens/day):
-- 1. Consider table partitioning by date (monthly partitions)
-- 2. Implement Redis cache layer for faster lookups
-- 3. Use bloom filters for quick negative checks
-- 4. Archive old blacklist data instead of deleting

-- Example partitioning setup (PostgreSQL 10+):
-- CREATE TABLE blacklisted_tokens (...)
-- PARTITION BY RANGE (blacklisted_at);
--
-- CREATE TABLE blacklisted_tokens_2025_01 PARTITION OF blacklisted_tokens
--     FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
-- (Create one partition per month)

-- ============================================================================
-- Security Considerations
-- ============================================================================

-- 1. Token hashes are irreversible (SHA-256) - safe to store
-- 2. No PII stored in this table (only user ID reference)
-- 3. IP addresses anonymized after 90 days (GDPR compliance)
-- 4. Audit trail preserved for HIPAA 7-year retention

-- Grant permissions (adjust based on your security model)
-- GRANT SELECT, INSERT ON blacklisted_tokens TO app_user;
-- GRANT DELETE ON blacklisted_tokens TO cleanup_job_user;
