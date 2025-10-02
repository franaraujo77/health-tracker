# 🔐 PR #1 Security Fixes - Implementation Plan

## Overview

This document provides a comprehensive plan to address the 9 CRITICAL security issues identified in the code review for PR #1 (Setup Epic).

**Target**: HIPAA-compliant Health Tracker Application
**Priority**: 🔴 CRITICAL - Must fix before merge
**Estimated Time**: 2-3 days
**Team**: Backend Security, Frontend, DevOps, Database, QA

---

## 📊 Issues Summary

| #   | Issue                | Severity    | Component         | Files Affected                | Estimate |
| --- | -------------------- | ----------- | ----------------- | ----------------------------- | -------- |
| 1   | Hardcoded Secrets    | 🔴 CRITICAL | Backend Config    | application.yml               | 2h       |
| 2   | JWT Validation Gaps  | 🔴 CRITICAL | Backend Security  | JwtService.java               | 4h       |
| 3   | Weak Encryption      | 🔴 CRITICAL | Backend Security  | EncryptedStringConverter.java | 3h       |
| 4   | No Rate Limiting     | 🔴 CRITICAL | Backend API       | Controllers, Config           | 4h       |
| 5   | Permissive CORS      | 🔴 CRITICAL | Backend Security  | SecurityConfig.java           | 1h       |
| 6   | Missing Validation   | 🔴 CRITICAL | Backend DTOs      | All DTO files                 | 3h       |
| 7   | localStorage XSS     | 🔴 CRITICAL | Frontend Security | axios.ts, AuthContext.tsx     | 5h       |
| 8   | Long JWT Expiration  | 🟠 HIGH     | Backend Config    | application.yml               | 1h       |
| 9   | No HTTPS Enforcement | 🟠 HIGH     | DevOps            | Docker, nginx                 | 2h       |

**Total Estimated Time**: 25 hours (3 working days)

---

## 🎯 Fix #1: Remove Hardcoded Secrets

### Current State (VULNERABLE)

```yaml
# backend/src/main/resources/application.yml:33-39
jwt:
  secret: ${JWT_SECRET:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}
  # ❌ CRITICAL: Hardcoded default secret
encryption:
  secret: ${ENCRYPTION_SECRET:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}
  # ❌ CRITICAL: Same secret as JWT!
```

### Required Changes

#### 1. Update application.yml

```yaml
# Remove ALL default values
jwt:
  secret: ${JWT_SECRET} # No default - will fail fast if not set
  access-token-expiration: 1800000 # 30 minutes (not 7 days)
  refresh-token-expiration: 2592000000 # 30 days
  issuer: ${JWT_ISSUER:health-tracker-api}
  audience: ${JWT_AUDIENCE:health-tracker-app}

encryption:
  secret: ${ENCRYPTION_SECRET} # Different secret required
  algorithm: ${ENCRYPTION_ALGORITHM:AES/GCM/NoPadding}
  key-derivation: PBKDF2 # Force proper key derivation
```

#### 2. Create application-dev.yml

```yaml
# Development-only configuration
jwt:
  secret: dev-secret-change-me-in-production-min-256-bits-required-for-hs256
  issuer: health-tracker-dev
  audience: health-tracker-dev-app

encryption:
  secret: dev-encryption-change-me-different-from-jwt-secret
```

#### 3. Create application-prod.yml

```yaml
# Production configuration - NO DEFAULTS
jwt:
  secret: ${JWT_SECRET} # MUST be set via environment
  issuer: ${JWT_ISSUER}
  audience: ${JWT_AUDIENCE}

encryption:
  secret: ${ENCRYPTION_SECRET} # MUST be set via environment
```

#### 4. Add Startup Validation

Create `ConfigValidator.java`:

```java
@Component
public class SecurityConfigValidator implements ApplicationListener<ApplicationReadyEvent> {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${encryption.secret}")
    private String encryptionSecret;

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        // Fail fast if secrets not properly configured
        if ("prod".equals(activeProfile)) {
            validateProductionSecrets();
        }
        validateSecretsDifferent();
        validateSecretStrength();
    }

    private void validateProductionSecrets() {
        if (jwtSecret.contains("dev-") || jwtSecret.contains("change-me")) {
            throw new IllegalStateException(
                "CRITICAL: Production cannot use development secrets. " +
                "Set JWT_SECRET environment variable."
            );
        }
    }

    private void validateSecretsDifferent() {
        if (jwtSecret.equals(encryptionSecret)) {
            throw new IllegalStateException(
                "CRITICAL: JWT secret and encryption secret MUST be different"
            );
        }
    }

    private void validateSecretStrength() {
        if (jwtSecret.length() < 32) {
            throw new IllegalStateException(
                "CRITICAL: JWT secret must be at least 256 bits (32 chars)"
            );
        }
    }
}
```

### Files to Modify

- `backend/src/main/resources/application.yml`
- `backend/src/main/resources/application-dev.yml` (create)
- `backend/src/main/resources/application-prod.yml` (create)
- `backend/src/main/java/com/healthtracker/backend/config/SecurityConfigValidator.java` (create)

### Testing

```bash
# Should fail - no secrets
./mvnw spring-boot:run -Dspring-boot.run.profiles=prod

# Should succeed - dev secrets
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Should succeed - prod with env vars
export JWT_SECRET="your-production-secret-min-256-bits"
export ENCRYPTION_SECRET="different-encryption-secret"
./mvnw spring-boot:run -Dspring-boot.run.profiles=prod
```

---

## 🎯 Fix #2: Enhance JWT Validation

### Current State (VULNERABLE)

```java
// JwtService.java:90-93
private boolean isTokenValid(String token, UserDetails userDetails) {
    final String username = extractUsername(token);
    return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    // ❌ Missing: revocation check, issuer/audience validation, token type
}
```

### Required Changes

#### 1. Add Token Blacklist Repository

```java
@Repository
public interface TokenBlacklistRepository extends JpaRepository<BlacklistedToken, Long> {
    boolean existsByTokenHash(String tokenHash);
}

@Entity
public class BlacklistedToken {
    @Id @GeneratedValue
    private Long id;
    private String tokenHash;  // SHA-256 hash of token
    private Instant expiresAt;
    private Instant blacklistedAt;
}
```

#### 2. Enhanced JWT Validation

```java
private boolean isTokenValid(String token, UserDetails userDetails) {
    try {
        final String username = extractUsername(token);

        // Check 1: Username match
        if (!username.equals(userDetails.getUsername())) {
            log.warn("Token username mismatch for user: {}", username);
            return false;
        }

        // Check 2: Expiration
        if (isTokenExpired(token)) {
            log.warn("Token expired for user: {}", username);
            return false;
        }

        // Check 3: Token revocation
        if (isTokenRevoked(token)) {
            log.warn("Token has been revoked for user: {}", username);
            return false;
        }

        // Check 4: Issuer validation
        if (!isIssuerValid(token)) {
            log.warn("Invalid issuer for token");
            return false;
        }

        // Check 5: Audience validation
        if (!isAudienceValid(token)) {
            log.warn("Invalid audience for token");
            return false;
        }

        // Check 6: Token type validation
        if (!isTokenTypeValid(token)) {
            log.warn("Invalid token type");
            return false;
        }

        return true;

    } catch (Exception e) {
        log.error("Token validation failed: {}", e.getMessage());
        return false;
    }
}

private boolean isTokenRevoked(String token) {
    String tokenHash = DigestUtils.sha256Hex(token);
    return tokenBlacklistRepository.existsByTokenHash(tokenHash);
}

private boolean isIssuerValid(String token) {
    String issuer = extractClaim(token, Claims::getIssuer);
    return jwtIssuer.equals(issuer);
}

private boolean isAudienceValid(String token) {
    String audience = extractClaim(token, claims -> claims.get("aud", String.class));
    return jwtAudience.equals(audience);
}

private boolean isTokenTypeValid(String token) {
    String type = extractClaim(token, claims -> claims.get("typ", String.class));
    return "JWT".equals(type);
}

public void revokeToken(String token) {
    String tokenHash = DigestUtils.sha256Hex(token);
    Instant expiresAt = extractExpiration(token).toInstant();

    BlacklistedToken blacklisted = new BlacklistedToken();
    blacklisted.setTokenHash(tokenHash);
    blacklisted.setExpiresAt(expiresAt);
    blacklisted.setBlacklistedAt(Instant.now());

    tokenBlacklistRepository.save(blacklisted);
}
```

#### 3. Update Token Generation

```java
private String buildToken(Map<String, Object> extraClaims, UserDetails userDetails, long expiration) {
    return Jwts.builder()
            .setClaims(extraClaims)
            .setSubject(userDetails.getUsername())
            .setIssuedAt(new Date(System.currentTimeMillis()))
            .setExpiration(new Date(System.currentTimeMillis() + expiration))
            .setIssuer(jwtIssuer)  // ✅ Add issuer
            .claim("aud", jwtAudience)  // ✅ Add audience
            .claim("typ", "JWT")  // ✅ Add token type
            .signWith(getSignInKey(), SignatureAlgorithm.HS256)
            .compact();
}
```

### Files to Modify

- `backend/src/main/java/com/healthtracker/backend/security/JwtService.java`
- `backend/src/main/java/com/healthtracker/backend/entity/BlacklistedToken.java` (create)
- `backend/src/main/java/com/healthtracker/backend/repository/TokenBlacklistRepository.java` (create)
- `backend/src/main/resources/db/migration/V7__create_token_blacklist_table.sql` (create)

### Migration SQL

```sql
-- V7__create_token_blacklist_table.sql
CREATE TABLE blacklisted_tokens (
    id BIGSERIAL PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    blacklisted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at)
);

-- Cleanup job for expired tokens (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_blacklisted_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM blacklisted_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## 🎯 Fix #3: Strengthen Encryption Key Derivation

### Current State (VULNERABLE)

```java
// EncryptedStringConverter.java:110-119
private SecretKeySpec getKey() {
    byte[] key = encryptionSecret.getBytes(StandardCharsets.UTF_8);
    // ❌ CRITICAL: Simple truncation, no key derivation
    if (key.length > 16) {
        key = Arrays.copyOf(key, 16);
    }
    return new SecretKeySpec(key, "AES");
}
```

### Required Changes

#### 1. Implement PBKDF2 Key Derivation

```java
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.GCMParameterSpec;
import java.security.SecureRandom;

@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;
    private static final int KEY_LENGTH = 256;
    private static final int PBKDF2_ITERATIONS = 100000;  // NIST recommendation
    private static final String PBKDF2_ALGORITHM = "PBKDF2WithHmacSHA256";

    @Value("${encryption.secret}")
    private String encryptionSecret;

    @Value("${encryption.salt:health-tracker-salt-change-in-prod}")
    private String salt;

    /**
     * Derives encryption key using PBKDF2 with 100,000 iterations.
     * Complies with NIST SP 800-132 recommendations for key derivation.
     */
    private SecretKey deriveKey() throws Exception {
        // Use PBKDF2 for proper key derivation
        PBEKeySpec spec = new PBEKeySpec(
            encryptionSecret.toCharArray(),
            salt.getBytes(StandardCharsets.UTF_8),
            PBKDF2_ITERATIONS,
            KEY_LENGTH
        );

        SecretKeyFactory factory = SecretKeyFactory.getInstance(PBKDF2_ALGORITHM);
        byte[] keyBytes = factory.generateSecret(spec).getEncoded();

        return new SecretKeySpec(keyBytes, "AES");
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return null;
        }

        try {
            SecretKey key = deriveKey();
            Cipher cipher = Cipher.getInstance(ALGORITHM);

            // Generate random IV for each encryption (important!)
            byte[] iv = new byte[GCM_IV_LENGTH];
            SecureRandom.getInstanceStrong().nextBytes(iv);

            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, key, gcmSpec);

            byte[] encrypted = cipher.doFinal(attribute.getBytes(StandardCharsets.UTF_8));

            // Combine IV + encrypted data
            byte[] combined = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);

            return Base64.getEncoder().encodeToString(combined);

        } catch (Exception e) {
            throw new RuntimeException("Encryption failed for PHI data", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return null;
        }

        try {
            SecretKey key = deriveKey();
            Cipher cipher = Cipher.getInstance(ALGORITHM);

            byte[] combined = Base64.getDecoder().decode(dbData);

            // Extract IV and encrypted data
            byte[] iv = new byte[GCM_IV_LENGTH];
            byte[] encrypted = new byte[combined.length - GCM_IV_LENGTH];

            System.arraycopy(combined, 0, iv, 0, iv.length);
            System.arraycopy(combined, iv.length, encrypted, 0, encrypted.length);

            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, key, gcmSpec);

            byte[] decrypted = cipher.doFinal(encrypted);
            return new String(decrypted, StandardCharsets.UTF_8);

        } catch (Exception e) {
            throw new RuntimeException("Decryption failed for PHI data", e);
        }
    }
}
```

#### 2. Add Unique Salt per Installation

```yaml
# application.yml
encryption:
  secret: ${ENCRYPTION_SECRET}
  salt: ${ENCRYPTION_SALT} # Unique per deployment
  algorithm: AES/GCM/NoPadding
```

### Files to Modify

- `backend/src/main/java/com/healthtracker/backend/security/EncryptedStringConverter.java`
- `backend/src/main/resources/application.yml`

### Security Notes

- ✅ Uses PBKDF2 with 100,000 iterations (NIST recommendation)
- ✅ AES-256-GCM for authenticated encryption
- ✅ Random IV per encryption operation
- ✅ Authenticated encryption prevents tampering
- ✅ Compliant with HIPAA encryption requirements

---

## 🎯 Fix #4: Add Rate Limiting

### Implementation Plan

This was already implemented by the `java-pro` agent. Files created:

- `RateLimitConfig.java`
- `RateLimitInterceptor.java`
- `WebConfig.java`
- `GlobalExceptionHandler.java`

### Verification Required

- ✅ Review implementation
- ✅ Test with curl (6 rapid requests should trigger 429)
- ✅ Verify X-Rate-Limit headers
- ✅ Test distributed scenarios

---

## 🎯 Fix #5: Fix CORS Configuration

### Current State (VULNERABLE)

```java
// SecurityConfig.java:115-122
cors.setAllowedOrigins(Arrays.asList("http://localhost:5173"));
cors.setAllowedHeaders(Arrays.asList("*"));  // ❌ Too permissive
```

### Required Changes

```java
@Bean
public CorsConfigurationSource corsConfigurationSource(
    @Value("${cors.allowed-origins}") String allowedOrigins) {

    CorsConfiguration configuration = new CorsConfiguration();

    // Environment-specific origins
    configuration.setAllowedOrigins(
        Arrays.asList(allowedOrigins.split(","))
    );

    // Specific headers only
    configuration.setAllowedHeaders(Arrays.asList(
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "X-XSRF-TOKEN"
    ));

    configuration.setAllowedMethods(Arrays.asList(
        "GET", "POST", "PUT", "DELETE", "OPTIONS"
    ));

    configuration.setAllowCredentials(true);
    configuration.setMaxAge(3600L);

    // Expose security headers
    configuration.setExposedHeaders(Arrays.asList(
        "X-Rate-Limit-Remaining",
        "X-Rate-Limit-Reset",
        "X-XSRF-TOKEN"
    ));

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", configuration);
    return source;
}
```

### Configuration

```yaml
# application-dev.yml
cors:
  allowed-origins: http://localhost:5173,http://localhost:3000

# application-prod.yml
cors:
  allowed-origins: ${CORS_ALLOWED_ORIGINS}  # e.g., https://app.example.com
```

### Files to Modify

- `backend/src/main/java/com/healthtracker/backend/config/SecurityConfig.java`
- `backend/src/main/resources/application.yml`

---

## 🎯 Fix #6: Add Input Validation to DTOs

This was already implemented by the `java-pro` agent with comprehensive Jakarta Validation annotations.

### Verification Required

- ✅ Review all DTOs for complete validation
- ✅ Test validation error responses
- ✅ Verify error messages don't leak system info

---

## 🎯 Fix #7: Fix localStorage XSS Risk

This was already implemented by the `frontend-developer` agent with httpOnly cookies.

### Verification Required

- ✅ Test login/logout flow
- ✅ Verify cookies have httpOnly flag
- ✅ Test token refresh mechanism
- ✅ Verify CSRF protection

---

## 🎯 Fix #8: Reduce JWT Expiration

### Required Change

```yaml
# application.yml
jwt:
  access-token-expiration: 1800000 # 30 minutes (was 7 days)
  refresh-token-expiration: 2592000000 # 30 days (keep)
```

### Files to Modify

- `backend/src/main/resources/application.yml`

---

## 🎯 Fix #9: Add HTTPS Enforcement

### nginx Configuration

```nginx
# frontend/nginx.conf
server {
    listen 80;
    server_name _;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.3 TLSv1.2;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;

    # ... rest of config
}
```

### Docker Compose

```yaml
# docker-compose.yml
services:
  frontend:
    environment:
      - NGINX_SSL_CERT=/etc/nginx/ssl/cert.pem
      - NGINX_SSL_KEY=/etc/nginx/ssl/key.pem
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
```

---

## 📝 Testing Checklist

### Security Tests

- [ ] Hardcoded secrets removed (app won't start without env vars in prod)
- [ ] JWT validation includes issuer/audience/type checks
- [ ] Token revocation works correctly
- [ ] Encryption uses PBKDF2 key derivation
- [ ] Rate limiting triggers after N requests
- [ ] CORS only allows specific origins
- [ ] Input validation rejects invalid data
- [ ] Tokens stored in httpOnly cookies
- [ ] Access tokens expire after 30 minutes
- [ ] HTTPS enforced in production

### Integration Tests

- [ ] Full authentication flow works
- [ ] Token refresh works with cookies
- [ ] Rate limiting doesn't affect normal usage
- [ ] CORS works from allowed origins only
- [ ] PHI data encrypted/decrypted correctly

### Load Tests

- [ ] Rate limiting performs under load
- [ ] Encryption doesn't degrade performance
- [ ] Token validation scales

---

## 🚀 Deployment Steps

### 1. Generate Production Secrets

```bash
# JWT Secret (256-bit)
openssl rand -hex 32

# Encryption Secret (different from JWT)
openssl rand -hex 32

# Encryption Salt (unique per deployment)
openssl rand -hex 16
```

### 2. Set Environment Variables

```bash
export JWT_SECRET="<generated-secret-1>"
export ENCRYPTION_SECRET="<generated-secret-2>"
export ENCRYPTION_SALT="<generated-salt>"
export CORS_ALLOWED_ORIGINS="https://yourdomain.com"
export COOKIE_SECURE=true
export SPRING_PROFILES_ACTIVE=prod
```

### 3. Verify Configuration

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=prod
# Should start successfully with all security validations passing
```

---

## 📊 Implementation Timeline

### Day 1 (8 hours)

- Morning: Fix #1 (Hardcoded Secrets) - 2h
- Morning: Fix #2 (JWT Validation) - 4h
- Afternoon: Fix #3 (Encryption) - 3h
- Testing: Integration tests - 1h

### Day 2 (8 hours)

- Morning: Fix #5 (CORS) - 1h
- Morning: Verify Fix #4 (Rate Limiting) - 2h
- Afternoon: Verify Fix #6 (Validation) - 2h
- Afternoon: Verify Fix #7 (XSS) - 2h
- Testing: Security tests - 1h

### Day 3 (8 hours)

- Morning: Fix #8 (JWT Expiration) - 1h
- Morning: Fix #9 (HTTPS) - 2h
- Afternoon: Comprehensive testing - 3h
- Afternoon: Documentation - 2h

---

## ✅ Success Criteria

- [ ] All 9 critical issues resolved
- [ ] Security tests pass
- [ ] No hardcoded secrets in codebase
- [ ] HTTPS enforced in production
- [ ] HIPAA compliance requirements met
- [ ] Documentation updated
- [ ] Code review approved
- [ ] QA testing completed

---

**Status**: Ready for implementation
**Priority**: 🔴 CRITICAL
**Target Completion**: 3 days
