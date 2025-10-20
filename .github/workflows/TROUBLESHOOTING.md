# Troubleshooting Guide - Validation Orchestrator CI/CD Pipeline

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [My PR Validations Failed - What Do I Do?](#my-pr-validations-failed---what-do-i-do)
- [Claude Review Was Skipped - Why?](#claude-review-was-skipped---why)
- [Pipeline Is Stuck/Hanging](#pipeline-is-stuckhanging)
- [Common Failure Scenarios](#common-failure-scenarios)
- [Log Interpretation Guide](#log-interpretation-guide)
- [Debugging Steps for Each Workflow](#debugging-steps-for-each-workflow)
- [Escalation Paths](#escalation-paths)

---

## Quick Diagnostics

### ✅ Quick Health Check

Before diving deep, run this quick checklist:

1. **Check PR Comment**: Look for the validation status comment on your PR
2. **Check Workflow Runs**: Click "Actions" tab → Find your PR's workflow run
3. **Download Artifacts**: Look for `error-report.json` in completed runs
4. **Check Recent Commits**: Verify your latest commit triggered the workflow

### 🔍 Finding Your Workflow Run

```bash
# Option 1: GitHub Web UI
1. Go to your PR
2. Click "Checks" tab
3. Look for "Validation Orchestrator" workflow

# Option 2: GitHub CLI
gh run list --branch your-branch-name --limit 5

# Option 3: Direct URL pattern
https://github.com/OWNER/REPO/actions/runs/RUN_ID
```

---

## My PR Validations Failed - What Do I Do?

### Step 1: Identify What Failed

Check the PR comment for the validation status table:

```markdown
| Stage        | Check      | Status     | Details         |
| ------------ | ---------- | ---------- | --------------- |
| **Frontend** | Type Check | ❌ Failed  | 5 errors        |
| **Backend**  | Unit Tests | ❌ Failed  | 3 test failures |
| **Frontend** | Lint       | ⚠️ Warning | 12 warnings     |
```

### Step 2: Reproduce Locally

Run the exact same validation that failed:

#### Frontend Failures

```bash
cd frontend

# For Lint failures
npm run lint

# For Type Check failures
npm run type-check

# For Test failures
npm test

# For Build failures
npm run build
```

#### Backend Failures

```bash
cd backend

# For Build/Compile failures
mvn clean compile

# For Unit Test failures
mvn test

# For Integration Test failures
mvn verify

# For Coverage failures
mvn verify  # Check JaCoCo report in target/site/jacoco/
```

#### Security Failures

Security scans run automatically in CI. To check:

```bash
# Check for vulnerable dependencies
npm audit  # Frontend
mvn dependency:tree  # Backend

# Review security advisories
gh api /repos/OWNER/REPO/vulnerability-alerts
```

### Step 3: Fix the Issues

#### Frontend Type Errors

**Common Issue**: TypeScript compilation errors

```typescript
// ❌ Error: Type 'string' is not assignable to type 'number'
const age: number = '25';

// ✅ Fix: Use correct type
const age: number = 25;
```

**Debugging Tips**:

- Run `npm run type-check` to see all errors
- Check imports: `import type { ... }` for type-only imports
- Verify props interfaces match usage
- Use VS Code's TypeScript language server for inline errors

#### Frontend Lint Warnings

**Common Issue**: ESLint rule violations

```javascript
// ❌ Warning: 'useState' is defined but never used
import { useState, useEffect } from 'react';

// ✅ Fix: Remove unused import
import { useEffect } from 'react';
```

**Debugging Tips**:

- Run `npm run lint` to see all warnings
- Use `npm run lint -- --fix` to auto-fix simple issues
- Check `.eslintrc.js` for project rules
- Review ESLint output for rule names (e.g., `no-unused-vars`)

#### Frontend Test Failures

**Common Issue**: Test assertions fail

```typescript
// ❌ Failing test
expect(result).toBe(200); // Actual: 401

// ✅ Fix: Update assertion or fix code
expect(result).toBe(401); // Or fix the code to return 200
```

**Debugging Tips**:

- Run `npm test` for interactive test mode
- Use `npm test -- --reporter=verbose` for detailed output
- Add `console.log()` for debugging test data
- Check mock data in `src/__tests__/__mocks__/`
- Review test setup in `vitest.setup.ts`

#### Frontend Build Failures

**Common Issue**: Build optimization or import errors

```typescript
// ❌ Error: Cannot find module './missing-file'
import { foo } from './missing-file';

// ✅ Fix: Correct import path
import { foo } from './correct-file';
```

**Debugging Tips**:

- Run `npm run build` locally
- Check for circular dependencies
- Verify all imports are correct
- Review build output in `dist/`
- Check `vite.config.ts` for configuration issues

#### Backend Build Failures

**Common Issue**: Java compilation errors

```java
// ❌ Error: cannot find symbol
private UserService userService;  // Missing import or bean

// ✅ Fix: Add import and verify bean exists
import com.example.service.UserService;
@Autowired
private UserService userService;
```

**Debugging Tips**:

- Run `mvn clean compile` locally
- Check `pom.xml` for missing dependencies
- Verify Java version: `java -version` (should be 21)
- Review imports and package structure
- Check for typos in class/method names

#### Backend Test Failures

**Common Issue**: Test assertions fail or setup issues

```java
// ❌ Failing test
assertEquals(200, response.getStatusCodeValue());  // Actual: 401

// ✅ Fix: Debug why authentication fails
// Check test context, mock data, or fix the controller logic
```

**Debugging Tips**:

- Run specific test: `mvn test -Dtest=TestClassName`
- Check test logs: `target/surefire-reports/`
- Review `application-test.yml` for test configuration
- Verify `@MockBean` and `@Autowired` setup
- Check database state in integration tests
- Use `@Transactional` for test isolation

#### Backend Coverage Failures

**Common Issue**: Code coverage below threshold (80%)

```bash
# Check coverage report
open backend/target/site/jacoco/index.html

# Coverage too low: 75%
# Need: 80%
```

**Debugging Tips**:

- Identify uncovered classes in JaCoCo report
- Add tests for uncovered code paths
- Consider if threshold is too high for new features
- Review `pom.xml` JaCoCo configuration
- Focus on critical business logic coverage

#### Security Scan Failures

**Common Issue**: Vulnerable dependencies

```bash
# Example: High severity vulnerability in dependency
npm audit  # Shows vulnerability details

# Fix: Update to patched version
npm update package-name

# Or: Use npm audit fix
npm audit fix --force  # Be careful with breaking changes
```

**Debugging Tips**:

- Review GitHub Security tab for details
- Check dependency advisories: `npm audit` or `mvn dependency:check`
- Update vulnerable packages to patched versions
- Consider alternative packages if no patch available
- Document risk acceptance if update breaks functionality

### Step 4: Verify Fix Locally

```bash
# Run the full validation suite locally
cd frontend && npm run lint && npm run type-check && npm test && npm run build
cd ../backend && mvn clean verify

# If all pass, commit and push
git add .
git commit -m "fix: resolve validation failures"
git push
```

### Step 5: Monitor CI

After pushing:

1. Go to your PR
2. Wait for "Validation Orchestrator" to run
3. Check for ✅ all green
4. Review PR comment for updated status

---

## Claude Review Was Skipped - Why?

### Understanding the Decision Logic

Claude Code review **ONLY** triggers when:

```
✅ all_passed = true AND has_critical_failures = false
```

Claude Code review **SKIPS** when:

```
❌ all_passed = false OR has_critical_failures = true
```

### Decision Tree

```
PR Push
  ↓
All validations passed?
  ├─ YES → Any critical failures?
  │         ├─ NO  → ✅ TRIGGER Claude Review
  │         └─ YES → ❌ SKIP (Critical failures)
  └─ NO  → ❌ SKIP (Validation failures)
```

### How to Diagnose

#### Step 1: Check PR Comment

Look for the skip reason in the PR comment:

**Example 1: Critical Failures**

```markdown
❌ **Critical failures detected** - Claude Code review will be skipped until issues are resolved.

**Issues**: 2 critical, 0 warnings
```

**Example 2: Non-Critical Issues**

```markdown
⚠️ **Non-critical issues found** - Claude Code review will be skipped until issues are resolved.

**Issues**: 0 critical, 3 warnings
```

#### Step 2: Download Error Report

```bash
# Get workflow run ID from PR checks
RUN_ID=12345

# Download error report artifact
gh run download ${RUN_ID} -n error-report

# View report
cat error-report.json
```

**Example error-report.json**:

```json
{
  "all_passed": false,
  "has_critical_failures": true,
  "errors": [
    {
      "validation": "frontend-typecheck",
      "severity": "critical",
      "message": "TypeScript compilation failed: 5 errors found"
    },
    {
      "validation": "frontend-lint",
      "severity": "warning",
      "message": "ESLint found 12 warnings"
    }
  ],
  "timestamp": "2025-10-19T20:30:45Z"
}
```

#### Step 3: Identify the Blocker

**Critical Validations** (these block review):

- ❌ Frontend: Type Check, Tests, Build
- ❌ Backend: Build, Unit Tests, Integration Tests
- ❌ Security: Dependency Scan, SAST

**Non-Critical Validations** (these also block review currently):

- ⚠️ Frontend: Linting
- ⚠️ Backend: Coverage Threshold

**Important**: Even non-critical failures cause `all_passed=false`, which skips Claude review. The "critical" distinction is for severity reporting only.

### How to Fix

1. **Fix All Failures**: See [My PR Validations Failed](#my-pr-validations-failed---what-do-i-do)
2. **Verify Locally**: Run all validations locally before pushing
3. **Push and Wait**: After pushing fixes, wait for CI to complete
4. **Verify Trigger**: Check that Claude review workflow starts

### Manual Override (Maintainers Only)

If you have write access and need to force a review despite failures:

```bash
# Manually trigger Claude review (workflow_dispatch)
gh workflow run claude-review-conditional.yml \
  -f pr_number=123 \
  -f force=true
```

**⚠️ Warning**: Only use this for exceptional cases (e.g., known CI flakiness, urgent hotfix).

---

## Pipeline Is Stuck/Hanging

### Symptoms

- Workflow shows "In progress" for >30 minutes
- Jobs show yellow spinner indefinitely
- No log output for several minutes

### Diagnosis Steps

#### Step 1: Check Workflow Status

```bash
# List recent runs
gh run list --branch your-branch --limit 5

# View specific run
gh run view RUN_ID --log

# Check if run is actually stuck
gh run view RUN_ID --json status,conclusion,startedAt,updatedAt
```

#### Step 2: Identify Stuck Job

Go to Actions tab → Click workflow run → Check which job is stuck:

- **frontend-ci**: Stuck on npm install, tests, or build
- **backend-ci**: Stuck on Maven download, tests, or build
- **security-validation**: Stuck on dependency scan or SAST
- **aggregate-results**: Waiting for dependencies
- **claude-review**: Waiting for inputs

#### Step 3: Check Timeouts

Each job has a timeout:

```yaml
# Default timeouts (see workflow files)
frontend-ci: 15 minutes
backend-ci: 20 minutes
security-validation: 10 minutes
aggregate-results: 5 minutes
post-status-comment: 5 minutes
claude-review: 30 minutes
```

If a job exceeds its timeout, it will be cancelled automatically.

### Common Causes

#### 1. Dependency Download Hangs

**Symptoms**: Stuck on `npm install` or Maven dependency download

**Causes**:

- Network issues with package registries
- Rate limiting on npm/Maven central
- Cache corruption

**Solution**:

```bash
# Cancel and re-run the workflow
gh run cancel RUN_ID
gh run rerun RUN_ID

# Or: Wait for timeout (workflow will auto-cancel)
```

#### 2. Infinite Test Loop

**Symptoms**: Tests run indefinitely without completing

**Causes**:

- Test watching for file changes (Vitest watch mode)
- Infinite loop in test code
- Async test without proper timeout

**Solution**:

```bash
# Check test configuration
# Frontend: vitest.config.ts should NOT have watch: true for CI
# Backend: Tests should have @Timeout annotation for long-running tests

# Fix locally and push
```

#### 3. Resource Exhaustion

**Symptoms**: Job hangs after starting, no CPU/memory errors

**Causes**:

- Memory leak in tests
- Too many parallel test runners
- Large build artifacts

**Solution**:

```yaml
# Add resource limits in workflow (if needed)
jobs:
  backend-ci:
    env:
      MAVEN_OPTS: '-Xmx1024m' # Limit Maven memory
```

#### 4. Waiting on Required Status Checks

**Symptoms**: PR shows "Waiting for status checks"

**Causes**:

- Required checks not configured correctly
- Checks renamed but branch protection not updated

**Solution**:

```bash
# List branch protection rules
gh api repos/OWNER/REPO/branches/main/protection

# Update required checks in Repository Settings
# Settings → Branches → Branch protection rules → main
```

### Immediate Actions

#### Option 1: Cancel and Re-run

```bash
# Cancel stuck workflow
gh run cancel RUN_ID

# Re-run workflow
gh run rerun RUN_ID
```

#### Option 2: Force Push

```bash
# Add empty commit to re-trigger
git commit --allow-empty -m "chore: re-trigger CI"
git push
```

#### Option 3: Check GitHub Status

```bash
# Check GitHub Actions status
curl https://www.githubstatus.com/api/v2/status.json

# Or visit: https://www.githubstatus.com/
```

### Prevention

1. **Set Appropriate Timeouts**: Ensure timeout values match expected job duration
2. **Use CI Mode**: Configure test runners for CI (no watch mode, no interactive prompts)
3. **Monitor Logs**: Regularly check logs for slow operations
4. **Cache Dependencies**: Use `actions/cache` for npm/Maven dependencies
5. **Limit Parallelism**: Don't run too many tests in parallel

---

## Common Failure Scenarios

### Scenario 1: "npm ERR! network request failed"

**Error**:

```
npm ERR! code ENOTFOUND
npm ERR! syscall getaddrinfo
npm ERR! errno ENOTFOUND
npm ERR! network request to https://registry.npmjs.org/package failed
```

**Cause**: Network timeout accessing npm registry

**Solution**:

```bash
# Re-run the workflow (usually transient)
gh run rerun RUN_ID

# Or: Check npm status
curl https://status.npmjs.org/api/v2/status.json
```

---

### Scenario 2: "Maven dependency resolution failed"

**Error**:

```
[ERROR] Failed to execute goal on project: Could not resolve dependencies
[ERROR] Failed to collect dependencies at com.example:package:jar:1.0.0
```

**Cause**: Maven Central timeout or missing dependency

**Solution**:

```bash
# Check if dependency exists
mvn dependency:tree | grep package-name

# Re-run workflow
gh run rerun RUN_ID

# If persistent, check Maven Central status
curl https://status.maven.org/api/v2/status.json
```

---

### Scenario 3: "ENOSPC: no space left on device"

**Error**:

```
Error: ENOSPC: no space left on device, write
```

**Cause**: GitHub Actions runner out of disk space

**Solution**:

```bash
# Clean up before builds (add to workflow)
- name: Free Disk Space
  run: |
    sudo rm -rf /usr/share/dotnet
    sudo rm -rf /opt/ghc
    sudo rm -rf /usr/local/share/boost
    df -h  # Check available space
```

---

### Scenario 4: "Port already in use"

**Error**:

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Cause**: Test server port conflict

**Solution**:

```bash
# Use dynamic ports in tests
# Or: Add cleanup step
- name: Kill Port Conflicts
  if: always()
  run: |
    lsof -ti:3000 | xargs kill -9 || true
```

---

### Scenario 5: "Test failed but no error message"

**Error**:

```
Tests:  1 failed, 10 passed, 11 total
(No error details shown)
```

**Cause**: Test framework not configured for CI output

**Solution**:

```bash
# Frontend: Update vitest.config.ts
export default defineConfig({
  test: {
    reporter: process.env.CI ? 'verbose' : 'default',
  },
});

# Backend: Add -X flag for debug output
mvn test -X
```

---

### Scenario 6: "Authentication failed when posting PR comment"

**Error**:

```
Error: HttpError: Resource not accessible by integration
```

**Cause**: Missing permissions on GITHUB_TOKEN

**Solution**:

```yaml
# Add permissions to job
permissions:
  contents: read
  pull-requests: write # Required for comments
```

---

### Scenario 7: "Artifact not found when downloading"

**Error**:

```
Error: Unable to find artifact with name: error-report
```

**Cause**: Artifact wasn't created or workflow run mismatch

**Solution**:

```bash
# Check if artifact exists
gh run view RUN_ID --log | grep "Upload"

# Verify artifact name matches
# Upload step: name: error-report
# Download step: name: error-report
```

---

### Scenario 8: "Claude review posted but PR comment not updated"

**Symptoms**: Claude review comments exist but validation status comment shows old data

**Cause**: Race condition or permission issue

**Solution**:

```bash
# Check workflow run order
gh run list --branch your-branch --limit 10

# Verify orchestrator completed before Claude review
# If out of order, this is expected behavior
```

---

## Log Interpretation Guide

### Reading GitHub Actions Logs

#### Log Structure

```
┌─ Workflow Run
│  ├─ Job: frontend-ci
│  │  ├─ Step: Checkout code
│  │  ├─ Step: Setup Node.js
│  │  ├─ Step: Install dependencies
│  │  ├─ Step: Run linting
│  │  ├─ Step: Type checking
│  │  ├─ Step: Run tests
│  │  └─ Step: Build
│  ├─ Job: backend-ci
│  └─ Job: aggregate-results
```

#### Log Symbols

- ✅ **Green checkmark**: Step succeeded
- ❌ **Red X**: Step failed
- 🟡 **Yellow circle**: Step in progress
- ⏭️ **Skip icon**: Step skipped (conditional)
- ⚠️ **Warning icon**: Step succeeded with warnings

### Frontend CI Logs

#### Successful Lint

```
> frontend@0.0.0 lint
> eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0

✓ 245 files linted, 0 errors, 0 warnings
```

#### Failed Lint

```
> frontend@0.0.0 lint
> eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0

/app/frontend/src/components/App.tsx
  23:10  warning  'useState' is defined but never used  @typescript-eslint/no-unused-vars

✖ 1 problem (0 errors, 1 warning)
```

**Interpretation**:

- File: `src/components/App.tsx`
- Line: 23, Column: 10
- Rule: `@typescript-eslint/no-unused-vars`
- Action: Remove unused import or use the variable

#### Successful Type Check

```
> frontend@0.0.0 type-check
> tsc --noEmit

(No output means success)
```

#### Failed Type Check

```
> frontend@0.0.0 type-check
> tsc --noEmit

src/components/Dashboard.tsx:42:5 - error TS2322: Type 'string' is not assignable to type 'number'.

42     const age: number = '25';
       ~~~

Found 1 error in src/components/Dashboard.tsx:42
```

**Interpretation**:

- File: `src/components/Dashboard.tsx`
- Line: 42, Column: 5
- Error: Type mismatch (string vs number)
- Action: Fix the type or value

#### Failed Tests

```
> frontend@0.0.0 test
> vitest run

 FAIL  src/components/LoginForm.test.tsx
  LoginForm
    ✓ renders login form (125ms)
    ✗ submits form with valid data (89ms)

  ● LoginForm › submits form with valid data

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: {"email": "test@example.com", "password": "password123"}
    Received: {"email": "test@example.com"}

      45 |     await user.click(submitButton);
      46 |
    > 47 |     expect(onSubmit).toHaveBeenCalledWith({
         |                      ^
      48 |       email: 'test@example.com',
      49 |       password: 'password123',
      50 |     });

Tests:  1 failed, 10 passed, 11 total
```

**Interpretation**:

- Test file: `src/components/LoginForm.test.tsx`
- Failed test: "submits form with valid data"
- Issue: `onSubmit` called with incomplete data (missing password)
- Line: 47
- Action: Fix form submission logic or update test expectations

### Backend CI Logs

#### Successful Compile

```
[INFO] --- maven-compiler-plugin:3.11.0:compile (default-compile) @ health-tracker ---
[INFO] Changes detected - recompiling the module!
[INFO] Compiling 47 source files to /app/backend/target/classes
[INFO] BUILD SUCCESS
```

#### Failed Compile

```
[INFO] --- maven-compiler-plugin:3.11.0:compile (default-compile) @ health-tracker ---
[INFO] Changes detected - recompiling the module!
[ERROR] /app/backend/src/main/java/com/example/controller/UserController.java:[23,8] cannot find symbol
  symbol:   class UserService
  location: class com.example.controller.UserController
[ERROR] COMPILATION ERROR
[INFO] BUILD FAILURE
```

**Interpretation**:

- File: `src/main/java/com/example/controller/UserController.java`
- Line: 23, Column: 8
- Error: Missing class/import `UserService`
- Action: Add import or verify class exists

#### Failed Tests

```
[INFO] --- maven-surefire-plugin:3.0.0:test (default-test) @ health-tracker ---
[INFO] Running com.example.controller.AuthenticationControllerTest
[ERROR] Tests run: 5, Failures: 1, Errors: 0, Skipped: 0
[ERROR] testLoginSuccess(com.example.controller.AuthenticationControllerTest)
  Expected: 200
  Actual: 401

[INFO] Results:
[ERROR] Failures:
[ERROR]   AuthenticationControllerTest.testLoginSuccess:45 expected:<200> but was:<401>
[ERROR] Tests run: 5, Failures: 1, Errors: 0, Skipped: 0
[INFO] BUILD FAILURE
```

**Interpretation**:

- Test class: `AuthenticationControllerTest`
- Failed test: `testLoginSuccess`
- Line: 45
- Expected: HTTP 200
- Actual: HTTP 401 (Unauthorized)
- Action: Fix authentication logic or update test

#### Coverage Failure

```
[INFO] --- jacoco-maven-plugin:0.8.11:check (jacoco-check) @ health-tracker ---
[INFO] Loading execution data file /app/backend/target/jacoco.exec
[WARNING] Rule violated for bundle health-tracker: lines covered ratio is 0.75, but expected minimum is 0.80
[INFO] BUILD FAILURE
```

**Interpretation**:

- Current coverage: 75%
- Required coverage: 80%
- Action: Add tests to increase coverage by 5%

### Security Validation Logs

#### Dependency Scan Success

```
[INFO] Dependency-Check is an open source tool performing a best effort analysis
[INFO] Checking for updates
[INFO] Analyzing dependencies
[INFO] No vulnerabilities found
```

#### Dependency Scan Failure

```
[ERROR] One or more dependencies were identified with known vulnerabilities:

axios-1.2.0.jar (pkg:npm/axios@1.2.0, cpe:2.3:a:axios:axios:1.2.0)
  - CVE-2023-45857: Axios CSRF vulnerability
    Severity: HIGH
    CVSS Score: 8.1

[INFO] BUILD FAILURE
```

**Interpretation**:

- Package: axios version 1.2.0
- Vulnerability: CVE-2023-45857 (CSRF)
- Severity: HIGH (8.1/10)
- Action: Update axios to patched version

### Orchestrator Logs

#### Aggregate Results

```
Collecting outputs from validation jobs:
  Frontend Lint: success
  Frontend Type: success
  Frontend Test: success
  Frontend Build: success
  Backend Build: success
  Backend Unit: success
  Backend Integration: success
  Backend Coverage: success
  Security Deps: success
  Security SAST: success

Result: all_passed=true, has_critical_failures=false
```

#### Error Collection

```
Collecting outputs from validation jobs:
  Frontend Lint: warning
  Frontend Type: failure
  Frontend Test: success
  Frontend Build: success

Errors detected:
  - validation: frontend-lint, severity: warning, message: ESLint found 12 warnings
  - validation: frontend-typecheck, severity: critical, message: TypeScript errors found

Result: all_passed=false, has_critical_failures=true
```

---

## Debugging Steps for Each Workflow

### Debugging validation-orchestrator.yml

**Symptoms**: Orchestrator not starting or failing

**Steps**:

1. **Check Trigger Configuration**

   ```bash
   # Verify PR is targeting main branch
   gh pr view 123 --json baseRefName,headRefName

   # Check if paths are ignored
   git diff --name-only origin/main | grep -v '\.md$' | grep -v '^docs/'
   ```

2. **Check Job Dependencies**

   ```yaml
   # Ensure needs are correct
   aggregate-results:
     needs: [frontend-ci, backend-ci, security-validation]
     if: always() # Must have this
   ```

3. **Verify Workflow Calls**

   ```bash
   # Check if called workflows exist
   ls .github/workflows/frontend-ci.yml
   ls .github/workflows/backend-ci.yml
   ls .github/workflows/security-validation.yml
   ```

4. **Check Permissions**
   ```yaml
   permissions:
     contents: read
     pull-requests: write # Required for PR comments
     checks: write
   ```

### Debugging frontend-ci.yml

**Symptoms**: Frontend validation failing

**Steps**:

1. **Reproduce Locally**

   ```bash
   cd frontend
   npm ci
   npm run lint
   npm run type-check
   npm test
   npm run build
   ```

2. **Check Node Version**

   ```bash
   # CI uses Node 20.x
   node --version  # Should be v20.x.x

   # Update if needed
   nvm install 20
   nvm use 20
   ```

3. **Check Package Lock**

   ```bash
   # Ensure package-lock.json is committed
   git status | grep package-lock.json

   # Regenerate if needed
   rm -rf node_modules package-lock.json
   npm install
   git add package-lock.json
   ```

4. **Check Environment Variables**

   ```bash
   # Review .env files (should not be in CI)
   # CI should use .env.test or environment secrets
   ```

5. **Enable Debug Logs**
   ```yaml
   # Add to workflow
   - name: Run Tests (Debug)
     run: npm test -- --reporter=verbose
     env:
       DEBUG: '*'
   ```

### Debugging backend-ci.yml

**Symptoms**: Backend validation failing

**Steps**:

1. **Reproduce Locally**

   ```bash
   cd backend
   mvn clean compile
   mvn test
   mvn verify
   ```

2. **Check Java Version**

   ```bash
   # CI uses Java 21
   java -version  # Should be openjdk 21.x.x

   # Set JAVA_HOME if needed
   export JAVA_HOME=/path/to/java-21
   ```

3. **Check Maven Dependencies**

   ```bash
   # View dependency tree
   mvn dependency:tree

   # Check for conflicts
   mvn dependency:analyze

   # Purge local cache if corrupted
   mvn dependency:purge-local-repository
   ```

4. **Check Test Resources**

   ```bash
   # Verify test configuration exists
   ls src/test/resources/application-test.yml

   # Check database setup
   cat src/test/resources/application-test.yml | grep datasource
   ```

5. **Enable Maven Debug**
   ```yaml
   # Add to workflow
   - name: Run Tests (Debug)
     run: mvn test -X # -X enables debug output
   ```

### Debugging security-validation.yml

**Symptoms**: Security scans failing

**Steps**:

1. **Check Dependency Audit**

   ```bash
   # Frontend
   cd frontend
   npm audit
   npm audit fix

   # Backend
   cd backend
   mvn dependency:tree
   mvn versions:display-dependency-updates
   ```

2. **Review Security Advisories**

   ```bash
   # Check GitHub security alerts
   gh api /repos/OWNER/REPO/vulnerability-alerts

   # Check Dependabot alerts
   gh api /repos/OWNER/REPO/dependabot/alerts
   ```

3. **Check CodeQL Setup**

   ```yaml
   # Verify languages are correct
   - name: Initialize CodeQL
     uses: github/codeql-action/init@v2
     with:
       languages: javascript, java # Must match your stack
   ```

4. **Manual Security Scan**

   ```bash
   # Frontend: Use npm audit
   npm audit --json > audit-report.json

   # Backend: Use OWASP Dependency-Check
   mvn org.owasp:dependency-check-maven:check
   ```

### Debugging claude-review-conditional.yml

**Symptoms**: Claude review not triggering or failing

**Steps**:

1. **Check Workflow Run Trigger**

   ```yaml
   # Must trigger on orchestrator completion
   on:
     workflow_run:
       workflows: ['Validation Orchestrator'] # Exact name match
       types: [completed]
   ```

2. **Verify Artifact Download**

   ```bash
   # Check if error-report exists
   gh run view RUN_ID --log | grep "error-report"

   # Download locally
   gh run download RUN_ID -n error-report
   cat error-report.json
   ```

3. **Check Decision Logic**

   ```bash
   # View evaluate job output
   gh run view RUN_ID --log | grep "should_review"

   # Expected output:
   # should_review=true (or false)
   ```

4. **Verify Conditional Execution**

   ```yaml
   # Claude review job condition
   if: needs.evaluate.outputs.should_review == 'true'

   # Skip notification job condition
   if: needs.evaluate.outputs.should_review == 'false'
   ```

5. **Check Claude Setup**
   ```bash
   # Verify Claude Code is properly configured
   # Check if ANTHROPIC_API_KEY secret exists
   gh secret list | grep ANTHROPIC_API_KEY
   ```

---

## Escalation Paths

### Level 1: Self-Service (0-30 minutes)

**Who**: Individual developer

**Actions**:

1. Check this troubleshooting guide
2. Reproduce issue locally
3. Review recent commits
4. Check GitHub Status page
5. Re-run failed workflow

**When to escalate**: If issue persists after 30 minutes

---

### Level 2: Team Support (30 minutes - 2 hours)

**Who**: Team lead or senior developer

**Actions**:

1. Review workflow logs in detail
2. Check for known issues in team docs
3. Verify infrastructure status (GitHub Actions, npm, Maven)
4. Check for recent workflow changes
5. Consult with DevOps team

**Contact**:

- 💬 Slack: `#engineering` channel
- 📧 Email: team-lead@company.com

**When to escalate**: If issue affects multiple PRs or teams

---

### Level 3: DevOps Team (2 hours - 4 hours)

**Who**: DevOps engineer

**Actions**:

1. Investigate workflow configuration issues
2. Check GitHub Actions runner status
3. Review secret and permission configurations
4. Investigate infrastructure problems
5. Consider workflow hotfix if needed

**Contact**:

- 💬 Slack: `#devops` channel (mention `@devops-oncall`)
- 📧 Email: devops@company.com
- 📞 Phone: On-call rotation (see PagerDuty)

**When to escalate**: If issue is infrastructure-related or affects production

---

### Level 4: Incident Response (> 4 hours or Production Impact)

**Who**: Incident commander + DevOps + Engineering leads

**Actions**:

1. Declare incident in PagerDuty
2. Create incident channel: `#incident-YYYY-MM-DD-description`
3. Assemble incident response team
4. Implement temporary workaround if possible
5. Root cause analysis and post-mortem

**Contact**:

- 🚨 PagerDuty: Trigger incident
- 💬 Slack: Create incident channel
- 📧 Email: incidents@company.com

---

### Emergency Contacts

#### DevOps On-Call

- **Primary**: Check PagerDuty schedule
- **Secondary**: Check PagerDuty schedule
- **Escalation**: Director of Engineering

#### GitHub Enterprise Support

- **Portal**: https://support.github.com/
- **Email**: enterprise-support@github.com
- **Phone**: Available in support portal
- **SLA**: 4 hours for critical issues

#### Service Status Pages

- **GitHub**: https://www.githubstatus.com/
- **npm**: https://status.npmjs.org/
- **Maven Central**: https://status.maven.org/

---

## Quick Reference Card

### 📋 Checklist: Before Escalating

- [ ] Checked PR comment for validation status
- [ ] Reviewed workflow run logs
- [ ] Downloaded and reviewed error-report.json artifact
- [ ] Reproduced issue locally
- [ ] Checked GitHub Status page
- [ ] Re-ran workflow at least once
- [ ] Reviewed this troubleshooting guide
- [ ] Searched team docs and Slack history
- [ ] Collected relevant error messages and logs

### 🔧 Quick Commands

```bash
# View recent runs
gh run list --branch your-branch --limit 5

# View specific run
gh run view RUN_ID --log

# Download artifacts
gh run download RUN_ID -n error-report

# Cancel stuck workflow
gh run cancel RUN_ID

# Re-run workflow
gh run rerun RUN_ID

# Check PR status
gh pr checks 123

# View workflow logs for specific job
gh run view RUN_ID --log --job JOB_ID
```

### 🎯 Common Solutions

| Problem               | Quick Fix                          |
| --------------------- | ---------------------------------- |
| Validation failed     | Run locally, fix, push             |
| Claude review skipped | Fix all validations                |
| Pipeline stuck        | Cancel and re-run                  |
| Network error         | Re-run (usually transient)         |
| Artifact not found    | Check upload/download names match  |
| Permission denied     | Add required permissions to job    |
| Test timeout          | Increase timeout or fix slow tests |
| Dependency error      | Clear cache, update lockfile       |

---

**Last Updated**: 2025-10-19
**Maintained By**: DevOps Team
**Feedback**: Create an issue or contact #devops on Slack
