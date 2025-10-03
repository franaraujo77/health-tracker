# Security Enhancements - Rate Limiting & Input Validation

This document describes the security enhancements implemented to protect authentication endpoints and ensure data integrity through comprehensive input validation.

## Table of Contents

1. [Rate Limiting Implementation](#rate-limiting-implementation)
2. [Input Validation](#input-validation)
3. [Configuration](#configuration)
4. [Testing](#testing)
5. [Production Deployment](#production-deployment)
6. [Monitoring & Alerting](#monitoring--alerting)

## Rate Limiting Implementation

### Overview

Rate limiting is implemented using **Bucket4j** with the token bucket algorithm to prevent brute force attacks on authentication endpoints. The implementation is:

- **Thread-safe**: Bucket4j provides lock-free concurrent access
- **Distributed-ready**: Can be scaled with Redis backend
- **Environment-specific**: Different limits for dev/prod environments
- **Observable**: Integrates with logging and monitoring

### Architecture

```
Client Request
      ↓
RateLimitInterceptor (checks bucket)
      ↓
  [Has tokens?]
    ↙     ↘
  Yes      No
   ↓        ↓
Proceed   429 Too Many Requests
```

### Components

#### 1. RateLimitConfig

**Location**: `/backend/src/main/java/com/healthtracker/backend/config/RateLimitConfig.java`

- Configures Bucket4j with Caffeine cache (in-memory)
- Provides bucket configuration supplier
- Supports distributed caching via ProxyManager interface

**Key Features**:

- Token bucket with configurable capacity and refill rate
- Automatic cleanup of stale entries
- Environment-specific configuration via properties
- Ready for Redis migration for distributed deployments

#### 2. RateLimitInterceptor

**Location**: `/backend/src/main/java/com/healthtracker/backend/security/RateLimitInterceptor.java`

- Intercepts requests before they reach controllers
- Per-IP address rate limiting
- Returns informative headers (X-Rate-Limit-Remaining, X-Rate-Limit-Reset)
- Logs security events for monitoring

**Security Features**:

- Extracts real IP from X-Forwarded-For (proxy/load balancer support)
- Generic error messages (no system info leakage)
- Automatic retry-after calculation
- Detailed logging for security monitoring

#### 3. WebConfig

**Location**: `/backend/src/main/java/com/healthtracker/backend/config/WebConfig.java`

- Registers rate limiting interceptor
- Applies to authentication endpoints only:
  - POST /api/v1/auth/login
  - POST /api/v1/auth/register
  - POST /api/v1/auth/refresh

### Rate Limiting Behavior

#### Default Configuration (Development)

```yaml
capacity: 5 requests
refill-period: 60 seconds
refill-tokens: 5 tokens
```

**Behavior**: User can make 5 requests immediately, then ~1 request every 12 seconds (60s / 5 tokens).

#### Production Configuration

```yaml
capacity: 3 requests
refill-period: 300 seconds (5 minutes)
refill-tokens: 3 tokens
```

**Behavior**: User can make 3 requests immediately, then must wait ~100 seconds between requests.

### Response Format

#### Success (Request Allowed)

```http
HTTP/1.1 200 OK
X-Rate-Limit-Remaining: 4
X-Rate-Limit-Reset: 1704470400
```

#### Rate Limit Exceeded

```http
HTTP/1.1 429 Too Many Requests
X-Rate-Limit-Retry-After-Seconds: 45
X-Rate-Limit-Remaining: 0
Content-Type: application/json

{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please retry after 45 seconds.",
  "retryAfterSeconds": 45
}
```

## Input Validation

### Overview

Comprehensive input validation using Jakarta Bean Validation annotations to prevent:

- SQL injection attacks
- Cross-site scripting (XSS)
- Buffer overflow attacks
- Password brute force (weak passwords)
- Data integrity violations

### ValidationAnnotations Applied

#### LoginRequest

**Location**: `/backend/src/main/java/com/healthtracker/backend/dto/auth/LoginRequest.java`

| Field    | Validations                       | Purpose                                |
| -------- | --------------------------------- | -------------------------------------- |
| email    | @NotBlank, @Email, @Size(max=255) | RFC 5321 compliance, prevent injection |
| password | @NotBlank, @Size(min=8, max=100)  | Prevent DoS, ensure minimum security   |

**Security Notes**:

- Email regex: `^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`
- Password max length prevents bcrypt DoS (bcrypt has 72-byte limit)
- No password complexity check at login (avoid leaking requirements)

#### RegisterRequest

**Location**: `/backend/src/main/java/com/healthtracker/backend/dto/auth/RegisterRequest.java`

| Field    | Validations                                | Purpose                           |
| -------- | ------------------------------------------ | --------------------------------- |
| email    | @NotBlank, @Email, @Size(min=5, max=255)   | RFC compliance, prevent injection |
| password | @NotBlank, @Size(min=8, max=100), @Pattern | NIST SP 800-63B, HIPAA compliance |
| roles    | (optional)                                 | RBAC, validated at service layer  |

**Password Pattern Requirements**:

```regex
^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]).{8,}$
```

Must contain:

- At least one lowercase letter (a-z)
- At least one uppercase letter (A-Z)
- At least one digit (0-9)
- At least one special character from: `!@#$%^&*()_+-=[]{}|;:,.<>?`
- Minimum 8 characters

**Valid Password Examples**:

- `MyP@ssw0rd`
- `Secure123!`
- `C0mpl3x$Pass`
- `Health#Track1`

### Error Response Format

#### Validation Error

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "timestamp": "2024-01-15T10:30:00",
  "status": 400,
  "error": "Validation Failed",
  "message": "Invalid input data",
  "errors": {
    "email": "Email must be a valid email address",
    "password": "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
  },
  "path": "/api/v1/auth/register"
}
```

## Configuration

### Environment Variables

For production deployment, set these environment variables:

```bash
# Rate Limiting
RATE_LIMIT_CAPACITY=3
RATE_LIMIT_PERIOD=300
RATE_LIMIT_REFILL=3
RATE_LIMIT_CACHE_SIZE=500000
RATE_LIMIT_CACHE_EXPIRE=7200

# Security
COOKIE_SECURE=true
JWT_SECRET=<your-secret-key>
ENCRYPTION_SECRET=<your-encryption-key>
```

### Application Profiles

#### Development Profile

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

- Lenient rate limits (10 requests/minute)
- Detailed logging (DEBUG level)
- Non-secure cookies (HTTP)
- Full distributed tracing

#### Production Profile

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

- Strict rate limits (3 requests/5 minutes)
- Minimal logging (INFO level)
- Secure cookies (HTTPS only)
- Full distributed tracing for monitoring

### Configuration Files

| File                   | Purpose                                               |
| ---------------------- | ----------------------------------------------------- |
| `application.yml`      | Base configuration with environment variable defaults |
| `application-dev.yml`  | Development overrides (lenient limits)                |
| `application-prod.yml` | Production overrides (strict limits)                  |

## Testing

### Unit Tests

#### Rate Limiting Tests

```java
@SpringBootTest
@AutoConfigureMockMvc
class RateLimitingTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testRateLimitExceeded() throws Exception {
        String loginRequest = """
            {
                "email": "test@example.com",
                "password": "Password123!"
            }
            """;

        // Make requests until rate limit exceeded
        for (int i = 0; i < 6; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(loginRequest))
                    .andExpect(i < 5 ?
                        status().isOk() :
                        status().isTooManyRequests()
                    );
        }
    }

    @Test
    void testRateLimitHeaders() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginRequest))
                .andExpect(header().exists("X-Rate-Limit-Remaining"))
                .andExpect(header().exists("X-Rate-Limit-Reset"));
    }
}
```

#### Validation Tests

```java
@SpringBootTest
@AutoConfigureMockMvc
class ValidationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testInvalidEmailFormat() throws Exception {
        String request = """
            {
                "email": "invalid-email",
                "password": "Password123!"
            }
            """;

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(request))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists());
    }

    @Test
    void testWeakPassword() throws Exception {
        String request = """
            {
                "email": "user@example.com",
                "password": "weak"
            }
            """;

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(request))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.password").exists());
    }
}
```

### Integration Tests

```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=RateLimitingTests

# Run with coverage
mvn test jacoco:report
```

### Manual Testing with curl

#### Test Rate Limiting

```bash
# Make multiple requests to trigger rate limit
for i in {1..6}; do
  curl -X POST http://localhost:8080/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Password123!"}' \
    -i
done
```

#### Test Validation

```bash
# Test invalid email
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"Password123!"}' \
  -i

# Test weak password
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"weak"}' \
  -i
```

## Production Deployment

### Distributed Rate Limiting with Redis

For production deployments across multiple instances, migrate to Redis-backed rate limiting:

#### 1. Add Redis Dependencies

```xml
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j-redis</artifactId>
    <version>8.10.1</version>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

#### 2. Update RateLimitConfig

```java
@Bean
public ProxyManager<String> proxyManager(RedissonClient redisson) {
    return RedissonProxyManager.builderFor(redisson)
        .withExpirationStrategy(
            ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(
                Duration.ofHours(1)
            )
        )
        .build();
}
```

#### 3. Configure Redis Connection

```yaml
spring:
  redis:
    host: ${REDIS_HOST:localhost}
    port: ${REDIS_PORT:6379}
    password: ${REDIS_PASSWORD:}
    ssl: ${REDIS_SSL:false}
```

### Load Balancer Configuration

Ensure your load balancer sets the `X-Forwarded-For` header:

**Nginx Example**:

```nginx
location /api/ {
    proxy_pass http://backend:8080;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**AWS Application Load Balancer**: Automatically sets `X-Forwarded-For`

### HTTPS Configuration

For production, ensure HTTPS is enforced:

```yaml
server:
  ssl:
    enabled: true
    key-store: classpath:keystore.p12
    key-store-password: ${KEYSTORE_PASSWORD}
    key-store-type: PKCS12
  cookie:
    secure: true
```

## Monitoring & Alerting

### Metrics to Monitor

1. **Rate Limit Events**
   - Log pattern: `Rate limit exceeded for IP`
   - Alert threshold: >50 events per hour
   - Indicates potential brute force attack

2. **Validation Failures**
   - Log pattern: `Validation failed for request`
   - Alert threshold: >100 failures per hour
   - May indicate scanning/probing attempts

3. **Authentication Failures**
   - Log pattern: `Authentication failed for request`
   - Alert threshold: >20 failures per IP per hour
   - Indicates credential stuffing attack

### Log Aggregation

Configure log shipping to your SIEM/log aggregation platform:

#### Logstash Configuration

Already configured with `logstash-logback-encoder` dependency.

#### Example Log Entries

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "WARN",
  "logger": "c.h.backend.security.RateLimitInterceptor",
  "message": "Rate limit exceeded for IP: 192.168.1.100 on endpoint: /api/v1/auth/login",
  "ip_address": "192.168.1.100",
  "endpoint": "/api/v1/auth/login",
  "retry_after_seconds": 45
}
```

### Prometheus Metrics

Rate limiting metrics are exposed via Spring Boot Actuator:

```bash
# Check metrics endpoint
curl http://localhost:8080/actuator/prometheus | grep rate_limit
```

### Alerting Rules

#### Datadog Example

```yaml
name: 'Authentication Brute Force Detected'
query: 'logs("Rate limit exceeded").rollup("count").by("ip_address").last("1h") > 50'
message: 'Potential brute force attack from IP {{ip_address}}'
```

#### Prometheus/Alertmanager Example

```yaml
- alert: HighRateLimitViolations
  expr: rate(rate_limit_exceeded_total[5m]) > 0.5
  annotations:
    summary: 'High rate of rate limit violations'
    description: 'More than 0.5 violations per second over 5 minutes'
```

## Dependencies Added

### Maven Dependencies (pom.xml)

```xml
<!-- Rate Limiting -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j-core</artifactId>
    <version>8.10.1</version>
</dependency>
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j-caffeine</artifactId>
    <version>8.10.1</version>
</dependency>
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
    <version>3.1.8</version>
</dependency>

<!-- Validation (already present) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

## Files Modified/Created

### Created Files

1. `/backend/src/main/java/com/healthtracker/backend/config/RateLimitConfig.java`
2. `/backend/src/main/java/com/healthtracker/backend/config/WebConfig.java`
3. `/backend/src/main/java/com/healthtracker/backend/security/RateLimitInterceptor.java`
4. `/backend/src/main/java/com/healthtracker/backend/exception/GlobalExceptionHandler.java`
5. `/backend/src/main/resources/application-dev.yml`
6. `/backend/src/main/resources/application-prod.yml`
7. `/backend/SECURITY_ENHANCEMENTS.md` (this file)

### Modified Files

1. `/backend/pom.xml` - Added Bucket4j dependencies
2. `/backend/src/main/java/com/healthtracker/backend/dto/auth/LoginRequest.java` - Enhanced validation
3. `/backend/src/main/java/com/healthtracker/backend/dto/auth/RegisterRequest.java` - Enhanced validation
4. `/backend/src/main/resources/application.yml` - Added rate limiting configuration

## Security Best Practices

### Rate Limiting

✅ **Implemented**:

- Per-IP rate limiting
- Token bucket algorithm
- Automatic cleanup
- Environment-specific limits
- Informative error messages

⚠️ **Future Enhancements**:

- Distributed rate limiting with Redis
- Per-user rate limiting (in addition to IP)
- Dynamic rate limit adjustment based on threat level
- CAPTCHA integration after N failures

### Input Validation

✅ **Implemented**:

- Email format validation (RFC compliance)
- Password complexity requirements (NIST SP 800-63B)
- Length limits (prevent DoS)
- Pattern validation
- Generic error messages (no info leakage)

⚠️ **Future Enhancements**:

- Password strength meter in frontend
- Compromised password check (HaveIBeenPwned API)
- Multi-language validation messages
- Custom validation annotations for business rules

### Monitoring

✅ **Implemented**:

- Structured logging (Logstash format)
- Security event logging
- Request/response headers for debugging
- Spring Boot Actuator metrics

⚠️ **Future Enhancements**:

- Real-time alerting integration
- Automatic IP blocking after threshold
- Integration with SIEM platforms
- Threat intelligence integration

## Support & Troubleshooting

### Common Issues

#### Rate Limit Not Applied

- Check interceptor registration in WebConfig
- Verify path patterns match your endpoints
- Check Spring profile is loaded correctly

#### Validation Not Working

- Ensure `@Valid` annotation on controller parameters
- Check GlobalExceptionHandler is component-scanned
- Verify spring-boot-starter-validation dependency

#### High Memory Usage

- Reduce cache size in production: `rate-limit.cache.maximum-size`
- Lower cache expiration: `rate-limit.cache.expire-after-access-seconds`
- Consider migrating to Redis for distributed caching

### Debug Logging

Enable debug logging for troubleshooting:

```yaml
logging:
  level:
    com.healthtracker.backend.security.RateLimitInterceptor: DEBUG
    com.healthtracker.backend.exception.GlobalExceptionHandler: DEBUG
```

## Compliance

### HIPAA Compliance

- ✅ Audit logging for authentication attempts
- ✅ Strong password requirements
- ✅ Rate limiting prevents unauthorized access
- ✅ Secure cookie configuration (production)
- ✅ No sensitive data in error messages

### NIST SP 800-63B

- ✅ Minimum 8-character passwords
- ✅ Password complexity requirements
- ✅ Rate limiting for authentication
- ✅ Secure session management

### OWASP Top 10

- ✅ A01 - Broken Access Control: Rate limiting prevents brute force
- ✅ A03 - Injection: Input validation prevents SQL injection
- ✅ A04 - Insecure Design: Security-first architecture
- ✅ A05 - Security Misconfiguration: Environment-specific configs
- ✅ A07 - Identification and Authentication Failures: Strong validation

---

**Last Updated**: January 2025
**Author**: Health Tracker Backend Team
**Version**: 1.0.0
