package com.healthtracker.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.stereotype.Component;

/**
 * Validates security-critical configuration at application startup.
 * Implements fail-fast pattern to prevent insecure deployments.
 *
 * <p>This validator ensures:
 * <ul>
 *   <li>Production deployments don't use development secrets</li>
 *   <li>JWT and encryption secrets are different (defense in depth)</li>
 *   <li>Secrets meet minimum length requirements for cryptographic strength</li>
 *   <li>CORS configuration is environment-appropriate</li>
 * </ul>
 *
 * <p><b>Security Rationale:</b>
 * Hardcoded or weak secrets are a critical vulnerability, especially for HIPAA-compliant
 * applications handling Protected Health Information (PHI). This validator prevents
 * deployment with insecure configurations.
 *
 * @author Health Tracker Security Team
 * @see org.springframework.boot.context.event.ApplicationReadyEvent
 */
@Slf4j
@Component
public class SecurityConfigValidator implements ApplicationListener<ApplicationReadyEvent> {

    private static final int MIN_SECRET_LENGTH = 32;  // 256 bits minimum for HS256
    private static final String DEV_SECRET_PATTERN = "dev-";
    private static final String CHANGE_ME_PATTERN = "change-me";

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${encryption.secret}")
    private String encryptionSecret;

    @Value("${encryption.salt}")
    private String encryptionSalt;

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    @Value("${cors.allowed-origins:}")
    private String corsAllowedOrigins;

    @Value("${server.cookie.secure}")
    private boolean cookieSecure;

    /**
     * Validates security configuration when application is fully started.
     * Throws IllegalStateException to prevent startup if configuration is insecure.
     *
     * @param event the application ready event
     * @throws IllegalStateException if security configuration is invalid
     */
    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        log.info("Starting security configuration validation for profile: {}", activeProfile);

        try {
            // Critical validations for all environments
            validateSecretsDifferent();
            validateSecretStrength();
            validateEncryptionSalt();

            // Environment-specific validations
            if (isProductionProfile()) {
                validateProductionSecrets();
                validateProductionCors();
                validateSecureCookies();
            }

            log.info("✅ Security configuration validation PASSED");
            log.info("JWT secret length: {} chars", jwtSecret.length());
            log.info("Encryption secret length: {} chars", encryptionSecret.length());
            log.info("Cookie secure flag: {}", cookieSecure);
            log.info("CORS allowed origins: {}", maskCorsOrigins());

        } catch (IllegalStateException e) {
            log.error("❌ SECURITY CONFIGURATION VALIDATION FAILED: {}", e.getMessage());
            log.error("Application startup ABORTED to prevent insecure deployment");
            throw e;
        }
    }

    /**
     * Validates that production doesn't use development secrets.
     * Development secrets contain "dev-" or "change-me" patterns.
     */
    private void validateProductionSecrets() {
        if (containsDevPattern(jwtSecret)) {
            throw new IllegalStateException(
                "CRITICAL SECURITY VIOLATION: Production environment cannot use development JWT secret. " +
                "Set JWT_SECRET environment variable with a production-grade secret (minimum 256 bits)."
            );
        }

        if (containsDevPattern(encryptionSecret)) {
            throw new IllegalStateException(
                "CRITICAL SECURITY VIOLATION: Production environment cannot use development encryption secret. " +
                "Set ENCRYPTION_SECRET environment variable with a production-grade secret."
            );
        }

        if (containsDevPattern(encryptionSalt)) {
            throw new IllegalStateException(
                "CRITICAL SECURITY VIOLATION: Production environment cannot use development encryption salt. " +
                "Set ENCRYPTION_SALT environment variable with a unique salt for this deployment."
            );
        }

        log.debug("✓ Production secrets validation passed");
    }

    /**
     * Validates that JWT secret and encryption secret are different.
     * Using the same secret for different purposes violates defense-in-depth principle.
     */
    private void validateSecretsDifferent() {
        if (jwtSecret.equals(encryptionSecret)) {
            throw new IllegalStateException(
                "CRITICAL SECURITY VIOLATION: JWT secret and encryption secret MUST be different. " +
                "Using the same secret for JWT signing and PHI encryption violates defense-in-depth principle. " +
                "Generate separate secrets for JWT_SECRET and ENCRYPTION_SECRET."
            );
        }

        if (jwtSecret.equals(encryptionSalt) || encryptionSecret.equals(encryptionSalt)) {
            throw new IllegalStateException(
                "CRITICAL SECURITY VIOLATION: Encryption salt must be different from secrets. " +
                "Set ENCRYPTION_SALT to a unique value."
            );
        }

        log.debug("✓ Secrets uniqueness validation passed");
    }

    /**
     * Validates that secrets meet minimum cryptographic strength requirements.
     * HS256 JWT signing requires at least 256 bits (32 characters) for secure operation.
     */
    private void validateSecretStrength() {
        if (jwtSecret.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException(
                String.format(
                    "CRITICAL SECURITY VIOLATION: JWT secret must be at least %d characters (256 bits) for HS256 algorithm. " +
                    "Current length: %d. Generate a longer secret using: openssl rand -hex 32",
                    MIN_SECRET_LENGTH, jwtSecret.length()
                )
            );
        }

        if (encryptionSecret.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException(
                String.format(
                    "CRITICAL SECURITY VIOLATION: Encryption secret must be at least %d characters for AES-256. " +
                    "Current length: %d. Generate a longer secret using: openssl rand -hex 32",
                    MIN_SECRET_LENGTH, encryptionSecret.length()
                )
            );
        }

        log.debug("✓ Secret strength validation passed");
    }

    /**
     * Validates that encryption salt is properly configured.
     * Salt should be unique per deployment to prevent rainbow table attacks.
     */
    private void validateEncryptionSalt() {
        if (encryptionSalt == null || encryptionSalt.trim().isEmpty()) {
            throw new IllegalStateException(
                "CRITICAL SECURITY VIOLATION: Encryption salt is required for PBKDF2 key derivation. " +
                "Set ENCRYPTION_SALT environment variable. Generate with: openssl rand -hex 16"
            );
        }

        if (encryptionSalt.length() < 16) {
            throw new IllegalStateException(
                "CRITICAL SECURITY VIOLATION: Encryption salt should be at least 16 characters (128 bits). " +
                "Current length: " + encryptionSalt.length()
            );
        }

        log.debug("✓ Encryption salt validation passed");
    }

    /**
     * Validates CORS configuration for production.
     * Production should have explicit allowed origins, not wildcards.
     */
    private void validateProductionCors() {
        if (corsAllowedOrigins == null || corsAllowedOrigins.trim().isEmpty()) {
            throw new IllegalStateException(
                "CRITICAL SECURITY VIOLATION: Production environment requires explicit CORS allowed origins. " +
                "Set CORS_ALLOWED_ORIGINS environment variable (e.g., 'https://app.example.com')."
            );
        }

        if (corsAllowedOrigins.contains("localhost")) {
            log.warn("⚠️  WARNING: Production CORS configuration includes localhost origins: {}",
                corsAllowedOrigins);
        }

        if (corsAllowedOrigins.contains("*")) {
            throw new IllegalStateException(
                "CRITICAL SECURITY VIOLATION: CORS wildcard (*) is not allowed in production. " +
                "Specify explicit allowed origins in CORS_ALLOWED_ORIGINS."
            );
        }

        log.debug("✓ Production CORS validation passed");
    }

    /**
     * Validates that secure cookies are enabled in production.
     * HTTPS-only cookies prevent token theft over insecure connections.
     */
    private void validateSecureCookies() {
        if (!cookieSecure) {
            throw new IllegalStateException(
                "CRITICAL SECURITY VIOLATION: Production environment MUST use secure cookies (HTTPS only). " +
                "Ensure server.cookie.secure=true and HTTPS is properly configured."
            );
        }

        log.debug("✓ Secure cookies validation passed");
    }

    /**
     * Checks if current profile is production.
     */
    private boolean isProductionProfile() {
        return activeProfile != null && (activeProfile.contains("prod") || activeProfile.contains("production"));
    }

    /**
     * Checks if a value contains development secret patterns.
     */
    private boolean containsDevPattern(String value) {
        return value != null &&
               (value.contains(DEV_SECRET_PATTERN) || value.contains(CHANGE_ME_PATTERN));
    }

    /**
     * Masks CORS origins for logging (shows only domains, not full URLs).
     */
    private String maskCorsOrigins() {
        if (corsAllowedOrigins == null || corsAllowedOrigins.trim().isEmpty()) {
            return "not configured";
        }

        String[] origins = corsAllowedOrigins.split(",");
        return origins.length + " origin(s) configured";
    }
}
