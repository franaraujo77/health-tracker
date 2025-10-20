# Code Review Follow-up Epics

Based on the comprehensive code review from 2025-10-19, the following epics need to be created in Notion.

---

## 🔴 HIGH PRIORITY EPICS

### Epic 1: Fix Security - Exception Message Leakage in AuthenticationController

**Priority**: High
**Type**: Epic
**Status**: To Do

**Description**:
The `/auth/me` endpoint uses generic `RuntimeException` which can leak stack traces in production environments, potentially exposing sensitive information about the application's internal structure.

**Current Code** (`backend/src/main/java/com/healthtracker/backend/controller/AuthenticationController.java:167`):

```java
User user = userRepository.findByEmail(email)
        .orElseThrow(() -> new RuntimeException("User not found"));
```

**Acceptance Criteria**:

- Replace `RuntimeException` with custom `EntityNotFoundException`
- Implement `@ExceptionHandler` in a `@ControllerAdvice` to return proper 404 JSON responses
- Ensure no stack traces leak to client in production
- Add test case to verify 404 response format

**Technical Details**:

```java
// Recommended fix
User user = userRepository.findByEmail(email)
        .orElseThrow(() -> new EntityNotFoundException("User not found"));
```

**Estimated Impact**: Security vulnerability - High
**Related Files**:

- `backend/src/main/java/com/healthtracker/backend/controller/AuthenticationController.java`
- New file: `backend/src/main/java/com/healthtracker/backend/exception/EntityNotFoundException.java`
- New file: `backend/src/main/java/com/healthtracker/backend/exception/GlobalExceptionHandler.java`

---

### Epic 2: Remove Redundant Authentication Check in /auth/me Endpoint

**Priority**: High
**Type**: Epic
**Status**: To Do

**Description**:
The `/auth/me` endpoint has redundant authentication check since Spring Security's filter chain already ensures authentication before reaching the controller method.

**Current Code** (`backend/src/main/java/com/healthtracker/backend/controller/AuthenticationController.java:159-161`):

```java
if (authentication == null || !authentication.isAuthenticated()) {
    return ResponseEntity.status(401).build();
}
```

**Acceptance Criteria**:

- Remove redundant authentication check
- Rely on Spring Security's `@PreAuthorize` or filter chain
- Add defensive assertion with logging if needed
- Verify all tests still pass
- Update documentation to clarify security configuration

**Technical Details**:

```java
// Recommended approach
// This should never be null due to @PreAuthorize or security filter chain
assert authentication != null && authentication.isAuthenticated();
```

**Estimated Impact**: Code quality improvement - Medium
**Related Files**:

- `backend/src/main/java/com/healthtracker/backend/controller/AuthenticationController.java`
- `backend/src/test/java/com/healthtracker/backend/controller/AuthenticationControllerIntegrationTest.java`

---

### Epic 3: Add JWT Token Expiration Test Coverage

**Priority**: High
**Type**: Epic
**Status**: To Do

**Description**:
No integration test currently verifies that expired JWT tokens are properly rejected by the `/auth/me` endpoint.

**Acceptance Criteria**:

- Add test case `shouldReturn401WhenTokenIsExpired()`
- Generate token with negative expiration time
- Verify 401 UNAUTHORIZED response
- Ensure proper error message is returned
- Document JWT expiration handling in test suite

**Technical Details**:

```java
@Test
@DisplayName("Should return 401 when JWT token is expired")
void shouldReturn401WhenTokenIsExpired() {
    // Generate token with -1 hour expiration
    UserDetails userDetails = userDetailsService.loadUserByUsername(testUser.getEmail());
    String expiredToken = jwtService.generateToken(userDetails, Map.of(), Duration.ofHours(-1));

    HttpHeaders headers = new HttpHeaders();
    headers.set("Authorization", "Bearer " + expiredToken);
    HttpEntity<Void> request = new HttpEntity<>(headers);

    ResponseEntity<String> response = restTemplate.exchange(
            getApiUrl("/v1/auth/me"),
            HttpMethod.GET,
            request,
            String.class
    );

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
}
```

**Estimated Impact**: Test coverage gap - High
**Related Files**:

- `backend/src/test/java/com/healthtracker/backend/controller/AuthenticationControllerIntegrationTest.java`
- `backend/src/main/java/com/healthtracker/backend/security/JwtService.java`

---

### Epic 4: Prevent N+1 Database Query in /auth/me Endpoint

**Priority**: High
**Type**: Epic
**Status**: To Do

**Description**:
Direct `userRepository.findByEmail()` call in controller without caching could create performance issues if the endpoint is called frequently. Each request triggers a database query even for the same user.

**Current Code** (`backend/src/main/java/com/healthtracker/backend/controller/AuthenticationController.java:166`):

```java
User user = userRepository.findByEmail(email)
    .orElseThrow(() -> new RuntimeException("User not found"));
```

**Acceptance Criteria**:

- Implement caching for user profile lookups using Spring Cache
- Configure appropriate TTL (e.g., 5 minutes)
- Add cache eviction strategy on user updates
- Benchmark performance improvement
- Add integration tests for cache behavior
- Document caching strategy

**Technical Details**:

- Use `@Cacheable` annotation with Redis or Caffeine
- Consider cache key strategy: `user:profile:{email}`
- Add cache eviction on user update/delete operations
- Monitor cache hit/miss rates

**Estimated Impact**: Performance optimization - High
**Related Files**:

- `backend/src/main/java/com/healthtracker/backend/controller/AuthenticationController.java`
- `backend/src/main/java/com/healthtracker/backend/service/AuthenticationService.java`
- New file: `backend/src/main/java/com/healthtracker/backend/config/CacheConfig.java`

---

## 🟡 MEDIUM PRIORITY EPICS

### Epic 5: Refactor - Move Repository Injection from Controller to Service Layer

**Priority**: Medium
**Type**: Epic
**Status**: To Do

**Description**:
Controllers should depend on services, not repositories directly. This violates layered architecture best practices and reduces testability.

**Current Code** (`backend/src/main/java/com/healthtracker/backend/controller/AuthenticationController.java:43`):

```java
private final UserRepository userRepository;
```

**Acceptance Criteria**:

- Move `/me` endpoint logic to `AuthenticationService`
- Remove `UserRepository` dependency from `AuthenticationController`
- Update all tests to reflect new architecture
- Ensure proper service layer encapsulation
- Document service layer responsibilities

**Technical Details**:

```java
@Service
public class AuthenticationService {
    private final UserRepository userRepository;

    public UserResponse getCurrentUserProfile(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));
        return mapToUserResponse(user);
    }
}
```

**Estimated Impact**: Architecture improvement - Medium
**Related Files**:

- `backend/src/main/java/com/healthtracker/backend/controller/AuthenticationController.java`
- `backend/src/main/java/com/healthtracker/backend/service/AuthenticationService.java`
- `backend/src/test/java/com/healthtracker/backend/controller/AuthenticationControllerIntegrationTest.java`

---

### Epic 6: Improve Lighthouse CI Skip Logic - Use Path-Based Detection

**Priority**: Medium
**Type**: Epic
**Status**: To Do

**Description**:
Current Lighthouse CI skip logic is too broad - it skips any PR with "mock" in the title. A PR titled "Remove mock data" would be skipped unnecessarily.

**Current Implementation** (`.github/workflows/lighthouse-ci.yml:15-19`):

```yaml
if: |
  !contains(github.event.pull_request.title, 'MSW') &&
  !contains(github.event.pull_request.title, 'mock')
```

**Acceptance Criteria**:

- Implement path-based detection for changed files
- Skip Lighthouse only when MSW-related files are modified
- Alternative: Use PR labels like `skip-lighthouse`
- Document skip logic in workflow
- Test with various PR scenarios

**Technical Details**:

```yaml
if: |
  !contains(github.event.pull_request.changed_files, 'src/mocks/') &&
  !contains(github.event.pull_request.changed_files, 'msw')
```

**Estimated Impact**: CI/CD improvement - Medium
**Related Files**:

- `.github/workflows/lighthouse-ci.yml`

---

### Epic 7: Replace Magic Strings in MSW Handlers with Constants

**Priority**: Medium
**Type**: Epic
**Status**: To Do

**Description**:
MSW authentication handlers use hardcoded API base URLs and user IDs, making them difficult to maintain and test across different environments.

**Current Code** (`frontend/src/mocks/handlers/auth.ts:24-28`):

```typescript
http.post('http://localhost:8080/api/v1/auth/login', ...)
```

**Acceptance Criteria**:

- Create constants file for MSW configuration
- Use environment variables for API base URL
- Generate unique user IDs per session
- Update all MSW handlers to use constants
- Add configuration documentation

**Technical Details**:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const MOCK_USER_ID = crypto.randomUUID(); // Generate unique ID per session
```

**Estimated Impact**: Code maintainability - Medium
**Related Files**:

- `frontend/src/mocks/handlers/auth.ts`
- New file: `frontend/src/mocks/config.ts`

---

### Epic 8: Add MSW Handler Contract Tests

**Priority**: Medium
**Type**: Epic
**Status**: To Do

**Description**:
No tests verify that MSW handlers correctly mock the backend API contract. This could lead to test failures when backend API changes.

**Acceptance Criteria**:

- Add integration tests for all MSW handlers
- Verify response status codes match backend
- Verify response shapes match backend DTOs
- Verify headers match backend responses
- Add contract validation for each auth endpoint:
  - POST /api/v1/auth/login
  - POST /api/v1/auth/register
  - POST /api/v1/auth/refresh
  - GET /api/v1/auth/me
  - POST /api/v1/auth/logout
  - GET /api/v1/auth/csrf

**Technical Details**:

- Create `src/mocks/handlers/__tests__/auth.contract.test.ts`
- Use schema validation (e.g., Zod) to verify response shapes
- Compare MSW responses with backend OpenAPI spec if available

**Estimated Impact**: Test coverage - Medium
**Related Files**:

- `frontend/src/mocks/handlers/auth.ts`
- New file: `frontend/src/mocks/handlers/__tests__/auth.contract.test.ts`

---

## 🟢 LOW PRIORITY EPICS

### Epic 9: Add Bundle Size Limits Configuration

**Priority**: Low
**Type**: Epic
**Status**: To Do

**Description**:
`check:bundle-size` and `size` scripts are defined in package.json but no `.size-limit.json` configuration file exists to enforce limits.

**Current State** (`frontend/package.json:29-31`):

```json
"check:bundle-size": "size-limit",
"size": "size-limit --why"
```

**Acceptance Criteria**:

- Create `.size-limit.json` with appropriate limits
- Set JavaScript bundle limit (recommended: 150 KB)
- Set CSS bundle limit (recommended: 20 KB)
- Integrate with CI pipeline to fail on limit violations
- Document bundle size strategy

**Technical Details**:

```json
[
  {
    "path": "dist/assets/index-*.js",
    "limit": "150 KB"
  },
  {
    "path": "dist/assets/index-*.css",
    "limit": "20 KB"
  }
]
```

**Estimated Impact**: Performance monitoring - Low
**Related Files**:

- New file: `frontend/.size-limit.json`
- `frontend/package.json`
- `.github/workflows/frontend-ci.yml`

---

### Epic 10: Add TypeScript Type Safety to Lighthouse Workflow

**Priority**: Low
**Type**: Epic
**Status**: To Do

**Description**:
Lighthouse CI workflow uses implicit any types for metrics objects, reducing code clarity and type safety.

**Current Code** (`.github/workflows/lighthouse-ci.yml:83-84`):

```javascript
let metrics = {};
```

**Acceptance Criteria**:

- Add JSDoc comments for type documentation
- Define metrics object shape
- Improve code readability
- Consider migrating to TypeScript for workflow scripts

**Technical Details**:

```javascript
/** @type {{ lcp: number, cls: string, tbt: number, fcp: number }} */
let metrics = {};
```

**Estimated Impact**: Code quality - Low
**Related Files**:

- `.github/workflows/lighthouse-ci.yml`

---

### Epic 11: Add Dark Mode Theme Tests for M3 Token System

**Priority**: Low
**Type**: Epic
**Status**: To Do

**Description**:
Extensive Material Design 3 token system implemented but no tests verify dark mode tokens are correctly applied when theme switches.

**Acceptance Criteria**:

- Add tests for theme switching functionality
- Verify dark mode tokens are applied correctly
- Verify light mode tokens are applied correctly
- Test CSS custom property values
- Test theme persistence (if implemented)
- Add visual regression tests (optional)

**Technical Details**:

```typescript
describe('Dark mode tokens', () => {
  it('should apply dark theme tokens when data-theme="dark"', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue(
      '--md-sys-color-primary'
    );
    expect(primaryColor).toBe('#aed581'); // Dark theme primary
  });
});
```

**Estimated Impact**: Test coverage - Low
**Related Files**:

- `frontend/src/theme/tokens/`
- New file: `frontend/src/theme/__tests__/theme-switching.test.ts`

---

## Summary

**Total Epics**: 11

- 🔴 High Priority: 4 epics
- 🟡 Medium Priority: 4 epics (Epic 5-8)
- 🟢 Low Priority: 3 epics (Epic 9-11)

### Recommended Implementation Order:

1. **Epic 1** - Security fix (exception leakage) - Critical
2. **Epic 4** - Performance (N+1 queries) - High impact
3. **Epic 3** - Test coverage (JWT expiration) - Quick win
4. **Epic 2** - Code quality (redundant check) - Quick win
5. **Epic 5** - Architecture (service layer) - Foundation
6. **Epics 6-8** - Medium priority improvements
7. **Epics 9-11** - Low priority enhancements

### Project Assignment:

All epics should be assigned to the **"Address PR Review Feedback - Production Readiness & Performance"** project in Notion.

### Next Steps:

1. Create these epics in Notion Issues table
2. Set Epic type and priority for each
3. Link to the parent project
4. Create stories for each epic to break down implementation
5. Assign to sprint based on priority
