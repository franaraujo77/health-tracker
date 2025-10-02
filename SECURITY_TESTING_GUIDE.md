# Security Testing Guide: Authentication XSS Fix

This guide provides step-by-step testing procedures to verify the XSS vulnerability fix and ensure the new authentication flow works correctly.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Security Testing](#security-testing)
3. [Functional Testing](#functional-testing)
4. [Integration Testing](#integration-testing)
5. [Browser Compatibility Testing](#browser-compatibility-testing)
6. [Performance Testing](#performance-testing)
7. [Automated Tests](#automated-tests)

---

## Prerequisites

### Required Tools

- Modern web browser (Chrome/Firefox/Safari)
- Browser DevTools
- cURL or Postman for API testing
- Optional: Burp Suite or OWASP ZAP for security testing

### Environment Setup

```bash
# Start backend
cd backend
./mvnw spring-boot:run

# Start frontend (in another terminal)
cd frontend
npm run dev
```

---

## Security Testing

### Test 1: Verify Tokens Not in localStorage

**Objective**: Confirm tokens are not stored in localStorage (XSS protection)

**Steps**:

1. Open browser DevTools (F12)
2. Navigate to login page: `http://localhost:5173/login`
3. Login with test credentials
4. Open Console tab in DevTools
5. Execute:
   ```javascript
   console.log('Access Token:', localStorage.getItem('accessToken'));
   console.log('Refresh Token:', localStorage.getItem('refreshToken'));
   ```

**Expected Result**: Both should return `null`

**Status**: ✅ PASS / ❌ FAIL

---

### Test 2: Verify httpOnly Cookie

**Objective**: Confirm refresh token is in httpOnly cookie (JavaScript cannot access)

**Steps**:

1. Stay logged in from Test 1
2. In DevTools Console, execute:
   ```javascript
   console.log('All Cookies:', document.cookie);
   ```
3. Look for "refresh_token" in the output
4. Navigate to Application tab → Cookies → `http://localhost:8080`
5. Find "refresh_token" cookie
6. Verify properties:
   - ✅ HttpOnly: true
   - ✅ Secure: false (true in production)
   - ✅ SameSite: Strict
   - ✅ Path: /api/v1/auth

**Expected Result**:

- `document.cookie` should NOT show refresh_token
- DevTools Application tab SHOULD show refresh_token with correct flags

**Status**: ✅ PASS / ❌ FAIL

---

### Test 3: XSS Attack Simulation

**Objective**: Verify XSS cannot steal tokens

**Steps**:

1. Stay logged in
2. In DevTools Console, simulate XSS attack:

   ```javascript
   // Try to steal access token
   const stolenAccessToken = localStorage.getItem('accessToken');
   console.log('Stolen Access Token:', stolenAccessToken);

   // Try to steal refresh token
   const cookies = document.cookie;
   const refreshToken = cookies.split(';').find((c) => c.trim().startsWith('refresh_token='));
   console.log('Stolen Refresh Token:', refreshToken);

   // Try to exfiltrate to attacker server
   if (stolenAccessToken || refreshToken) {
     console.error('🔴 SECURITY FAILURE: Tokens can be stolen!');
   } else {
     console.log('✅ SECURITY SUCCESS: Tokens cannot be stolen');
   }
   ```

**Expected Result**:

- stolenAccessToken: `null`
- refreshToken: `undefined`
- Message: "✅ SECURITY SUCCESS: Tokens cannot be stolen"

**Status**: ✅ PASS / ❌ FAIL

---

### Test 4: CSRF Protection

**Objective**: Verify CSRF tokens are properly implemented

**Steps**:

1. Login to application
2. Open DevTools → Network tab
3. Make an authenticated request (e.g., navigate to dashboard)
4. Find request in Network tab
5. Check Request Headers for CSRF token
6. Verify Response Headers include CSRF cookie

**Expected Result**:

- Request includes: `X-XSRF-TOKEN` header (for non-auth endpoints)
- Response includes: `Set-Cookie: XSRF-TOKEN=...`

**Status**: ✅ PASS / ❌ FAIL

---

### Test 5: HTTPS Cookie Security (Production Only)

**Objective**: Verify secure flag on cookies in production

**Steps**:

1. Deploy to HTTPS environment
2. Login to application
3. Check cookie properties in DevTools
4. Verify "Secure" flag is checked

**Expected Result**: Secure flag = true in production

**Status**: ⏸️ SKIP (Dev) / ✅ PASS / ❌ FAIL (Prod)

---

## Functional Testing

### Test 6: Login Flow

**Objective**: Verify login stores access token in memory and sets cookie

**Steps**:

1. Navigate to login page
2. Open DevTools → Network tab
3. Login with valid credentials
4. Check Network tab for `/api/v1/auth/login` request
5. Verify Response Headers include:
   ```
   Set-Cookie: refresh_token=...; HttpOnly; SameSite=Strict
   ```
6. Verify Response Body includes:
   ```json
   {
     "accessToken": "eyJ...",
     "tokenType": "Bearer",
     "expiresIn": 604800000
   }
   ```
7. Verify "refreshToken" is NOT in response body

**Expected Result**:

- ✅ Login successful
- ✅ Access token in response body
- ✅ Refresh token in cookie (not response)
- ✅ User redirected to dashboard

**Status**: ✅ PASS / ❌ FAIL

---

### Test 7: Authenticated API Requests

**Objective**: Verify access token is sent with API requests

**Steps**:

1. Stay logged in
2. Navigate to dashboard or health metrics page
3. Open DevTools → Network tab
4. Observe API requests to backend
5. Check Request Headers for:
   ```
   Authorization: Bearer eyJ...
   Cookie: refresh_token=...
   ```

**Expected Result**:

- ✅ Authorization header present with access token
- ✅ Cookie header includes refresh token
- ✅ API request successful (200 OK)

**Status**: ✅ PASS / ❌ FAIL

---

### Test 8: Token Refresh on Page Load

**Objective**: Verify user stays logged in after page refresh

**Steps**:

1. Login to application
2. Navigate to protected page (e.g., dashboard)
3. Press F5 to refresh page
4. Open DevTools → Network tab
5. Look for `/api/v1/auth/refresh` request
6. Verify user remains logged in

**Expected Result**:

- ✅ Refresh request sent automatically
- ✅ New access token received
- ✅ User stays logged in
- ✅ Protected content loads

**Status**: ✅ PASS / ❌ FAIL

---

### Test 9: Automatic Token Refresh on Expiry

**Objective**: Verify access token refreshes automatically when expired

**Setup**:

```yaml
# Temporarily reduce token expiration for testing
# backend/src/main/resources/application.yml
jwt:
  access-token-expiration: 60000 # 1 minute
```

**Steps**:

1. Login to application
2. Wait 61 seconds (access token expires)
3. Make an API request (e.g., navigate to dashboard)
4. Open DevTools → Network tab
5. Look for:
   - Initial request → 401 Unauthorized
   - `/api/v1/auth/refresh` request → 200 OK
   - Retry of original request → 200 OK

**Expected Result**:

- ✅ First request fails with 401
- ✅ Token automatically refreshed
- ✅ Original request retried successfully
- ✅ User experience is seamless (no visible error)

**Status**: ✅ PASS / ❌ FAIL

**Cleanup**: Restore original token expiration time

---

### Test 10: Logout Flow

**Objective**: Verify logout clears tokens and cookies

**Steps**:

1. Login to application
2. Open DevTools → Network tab and Application tab
3. Note the refresh_token cookie exists
4. Click logout button
5. Verify in Network tab:
   - `/api/v1/auth/logout` request sent
6. Verify in Application tab:
   - refresh_token cookie deleted or Max-Age=0
7. Try to access protected page

**Expected Result**:

- ✅ Logout request sent to backend
- ✅ Cookie cleared in browser
- ✅ User redirected to login page
- ✅ Cannot access protected pages

**Status**: ✅ PASS / ❌ FAIL

---

### Test 11: Multiple Tabs Behavior

**Objective**: Verify authentication works correctly across multiple tabs

**Steps**:

1. Login in Tab 1
2. Open Tab 2 with same application
3. Verify Tab 2 is automatically logged in
4. In Tab 1, make an API request that triggers token refresh
5. In Tab 2, make an API request
6. Logout in Tab 1
7. Try to make request in Tab 2

**Expected Result**:

- ✅ Tab 2 shares authentication state
- ✅ Token refresh in Tab 1 updates cookie for Tab 2
- ✅ Logout in Tab 1 logs out Tab 2
- ✅ Tab 2 redirected to login after logout

**Status**: ✅ PASS / ❌ FAIL

---

### Test 12: Invalid/Expired Refresh Token

**Objective**: Verify app handles expired refresh token gracefully

**Steps**:

1. Login to application
2. Open DevTools → Application tab
3. Manually delete or modify refresh_token cookie
4. Refresh page or make API request
5. Verify behavior

**Expected Result**:

- ✅ Token refresh fails
- ✅ User redirected to login page
- ✅ No infinite refresh loops
- ✅ Clear error handling

**Status**: ✅ PASS / ❌ FAIL

---

## Integration Testing

### Test 13: End-to-End Registration Flow

**Objective**: Verify complete registration process with new auth system

**Steps**:

1. Navigate to registration page
2. Fill in registration form
3. Submit form
4. Open DevTools → Network tab
5. Verify `/api/v1/auth/register` response:
   - Sets refresh_token cookie
   - Returns access token
   - No refresh token in response body
6. Verify user is automatically logged in
7. Verify user can access protected resources

**Expected Result**: ✅ Complete registration and authentication flow works

**Status**: ✅ PASS / ❌ FAIL

---

### Test 14: Session Persistence Across Browser Restart

**Objective**: Verify user stays logged in after closing browser

**Steps**:

1. Login to application
2. Close browser completely
3. Reopen browser
4. Navigate to application URL
5. Verify user state

**Expected Result**:

- ✅ User automatically logged in (if cookie persists)
- ✅ Or login page shown (if cookie cleared)
- Behavior depends on browser cookie settings

**Status**: ✅ PASS / ❌ FAIL

---

### Test 15: Rate Limiting

**Objective**: Verify rate limiting protects auth endpoints

**Steps**:

1. Use cURL or Postman to send multiple rapid requests:
   ```bash
   for i in {1..10}; do
     curl -X POST http://localhost:8080/api/v1/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@test.com","password":"wrong"}'
   done
   ```
2. Observe response status codes

**Expected Result**:

- First 5 requests: 401 Unauthorized (invalid credentials)
- After 5 requests: 429 Too Many Requests

**Status**: ✅ PASS / ❌ FAIL

---

## Browser Compatibility Testing

### Test 16: Cross-Browser Compatibility

Test the following in each browser:

**Browsers**:

- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

**Test Cases**:

- ✅ Login/logout works
- ✅ Cookies set correctly
- ✅ Token refresh works
- ✅ Page reload maintains session
- ✅ Multiple tabs work correctly

**Status per Browser**:

- Chrome: ⬜
- Firefox: ⬜
- Safari: ⬜
- Mobile Safari: ⬜
- Chrome Mobile: ⬜

---

## Performance Testing

### Test 17: Token Refresh Performance

**Objective**: Verify token refresh doesn't cause performance issues

**Steps**:

1. Login to application
2. Open DevTools → Performance tab
3. Start recording
4. Trigger token refresh (wait for expiry or delete access token from memory)
5. Make API request
6. Stop recording
7. Analyze performance timeline

**Expected Result**:

- ✅ Token refresh completes in <500ms
- ✅ No blocking of UI
- ✅ Request queuing works correctly

**Status**: ✅ PASS / ❌ FAIL

---

### Test 18: Concurrent Requests During Refresh

**Objective**: Verify multiple concurrent requests don't cause multiple refresh attempts

**Steps**:

1. Login to application
2. Clear access token from memory (simulate expiry)
3. Open DevTools → Network tab
4. Trigger multiple API requests simultaneously:
   ```javascript
   // In DevTools Console
   Promise.all([
     fetch('/api/v1/health-metrics'),
     fetch('/api/v1/health-metrics'),
     fetch('/api/v1/health-metrics'),
   ]);
   ```
5. Check Network tab for refresh requests

**Expected Result**:

- ✅ Only ONE `/api/v1/auth/refresh` request made
- ✅ All three requests eventually succeed
- ✅ No race conditions

**Status**: ✅ PASS / ❌ FAIL

---

## Automated Tests

### Test 19: Unit Tests for Token Storage

```typescript
// frontend/src/lib/__tests__/axios.test.ts

describe('Token Storage', () => {
  beforeEach(() => {
    tokenStorage.clearTokens();
  });

  test('stores access token in memory only', () => {
    const testToken = 'test-access-token';
    tokenStorage.setAccessToken(testToken);

    expect(tokenStorage.getAccessToken()).toBe(testToken);
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  test('clears access token from memory', () => {
    tokenStorage.setAccessToken('test-token');
    tokenStorage.clearTokens();

    expect(tokenStorage.getAccessToken()).toBeNull();
  });

  test('hasAccessToken returns correct state', () => {
    expect(tokenStorage.hasAccessToken()).toBe(false);

    tokenStorage.setAccessToken('test-token');
    expect(tokenStorage.hasAccessToken()).toBe(true);

    tokenStorage.clearTokens();
    expect(tokenStorage.hasAccessToken()).toBe(false);
  });
});
```

Run with: `npm test`

**Expected**: All tests pass

**Status**: ✅ PASS / ❌ FAIL

---

### Test 20: Integration Tests for Auth Flow

```typescript
// frontend/src/__tests__/auth-flow.test.tsx

describe('Authentication Flow', () => {
  test('login sets access token and user state', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toBeDefined();
    expect(tokenStorage.getAccessToken()).toBeTruthy();
  });

  test('logout clears tokens and user state', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.login('test@example.com', 'password');
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(tokenStorage.getAccessToken()).toBeNull();
  });
});
```

**Expected**: All tests pass

**Status**: ✅ PASS / ❌ FAIL

---

### Test 21: Backend Cookie Tests

```java
// backend/src/test/java/com/healthtracker/backend/controller/AuthenticationControllerTest.java

@Test
void login_shouldSetHttpOnlyCookie() throws Exception {
    LoginRequest request = new LoginRequest("test@example.com", "password");

    mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(cookie().exists("refresh_token"))
        .andExpect(cookie().httpOnly("refresh_token", true))
        .andExpect(cookie().secure("refresh_token", false))
        .andExpect(cookie().path("refresh_token", "/api/v1/auth"))
        .andExpect(jsonPath("$.accessToken").exists())
        .andExpect(jsonPath("$.refreshToken").doesNotExist());
}

@Test
void logout_shouldClearCookie() throws Exception {
    mockMvc.perform(post("/api/v1/auth/logout"))
        .andExpect(status().isOk())
        .andExpect(cookie().maxAge("refresh_token", 0));
}
```

Run with: `./mvnw test`

**Expected**: All tests pass

**Status**: ✅ PASS / ❌ FAIL

---

## Test Summary Report

| Test # | Test Name                  | Category      | Status | Notes           |
| ------ | -------------------------- | ------------- | ------ | --------------- |
| 1      | Tokens Not in localStorage | Security      | ⬜     |                 |
| 2      | httpOnly Cookie            | Security      | ⬜     |                 |
| 3      | XSS Attack Simulation      | Security      | ⬜     |                 |
| 4      | CSRF Protection            | Security      | ⬜     |                 |
| 5      | HTTPS Cookie Security      | Security      | ⏸️     | Production only |
| 6      | Login Flow                 | Functional    | ⬜     |                 |
| 7      | Authenticated Requests     | Functional    | ⬜     |                 |
| 8      | Token Refresh on Load      | Functional    | ⬜     |                 |
| 9      | Auto Token Refresh         | Functional    | ⬜     |                 |
| 10     | Logout Flow                | Functional    | ⬜     |                 |
| 11     | Multiple Tabs              | Functional    | ⬜     |                 |
| 12     | Invalid Refresh Token      | Functional    | ⬜     |                 |
| 13     | Registration Flow          | Integration   | ⬜     |                 |
| 14     | Session Persistence        | Integration   | ⬜     |                 |
| 15     | Rate Limiting              | Integration   | ⬜     |                 |
| 16     | Browser Compatibility      | Compatibility | ⬜     |                 |
| 17     | Refresh Performance        | Performance   | ⬜     |                 |
| 18     | Concurrent Requests        | Performance   | ⬜     |                 |
| 19     | Unit Tests                 | Automated     | ⬜     |                 |
| 20     | Integration Tests          | Automated     | ⬜     |                 |
| 21     | Backend Tests              | Automated     | ⬜     |                 |

**Overall Status**: ⬜ Not Started / 🔄 In Progress / ✅ Passed / ❌ Failed

---

## Sign-Off

**Tested By**: **\*\*\*\***\_\_\_**\*\*\*\***

**Date**: **\*\*\*\***\_\_\_**\*\*\*\***

**Environment**: Development / Staging / Production

**Overall Result**: ✅ APPROVED / ❌ REJECTED

**Notes**:

---

---

---

---

**Last Updated**: 2025-10-02
