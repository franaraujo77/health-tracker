# PR Merge Blocking Configuration

## Overview

This guide explains how to configure GitHub branch protection rules to automatically block pull request merges when Flyway migration validation fails in the CI/CD pipeline.

## Why PR Merge Blocking Matters

Blocking PRs with failed migration validation prevents:

1. **Database Schema Corruption** - Invalid migrations reaching production
2. **Deployment Failures** - Application startup failures due to schema mismatches
3. **Data Loss Risks** - Incorrectly structured migrations affecting data integrity
4. **Production Incidents** - Emergency rollbacks and system downtime

## Prerequisites

- Repository admin access to configure branch protection
- GitHub Actions CI pipeline configured with migration-validation job
- Migration validation job implemented in `.github/workflows/backend-ci.yml`

## Configuration Steps

### 1. Access Branch Protection Settings

1. Navigate to your repository on GitHub
2. Click **Settings** tab
3. Select **Branches** from the left sidebar
4. You'll see **Branch protection rules** section

### 2. Create Protection Rule for `main` Branch

1. Click **Add branch protection rule**
2. In **Branch name pattern**, enter: `main`
3. Configure the required settings as described below

### 3. Configure Required Settings

#### A. Require Pull Request Reviews

Enable:

- [x] **Require a pull request before merging**

Configure:

- **Required approvals**: `1` (minimum recommended)
- [x] **Dismiss stale pull request approvals when new commits are pushed**
- [x] **Require review from Code Owners** (if CODEOWNERS file exists)

**Why:** Ensures human review before merging changes

#### B. Require Status Checks (CRITICAL)

Enable:

- [x] **Require status checks to pass before merging**

Configure:

- [x] **Require branches to be up to date before merging**

**Required status checks** - Select all that apply:

- [x] `Build & Test`
- [x] `Code Coverage`
- [x] `Security Scan`
- [x] `Code Quality Check`
- [x] **`Migration Validation`** ← **CRITICAL FOR DATABASE SAFETY**

**How to find status check names:**

1. Look at the `name:` field in your `.github/workflows/backend-ci.yml` file
2. For migration-validation job, the status check name is defined by the `name:` attribute under the job (line 239): `Migration Validation`

**Why:** This is the core setting that blocks PRs with failed migrations

#### C. Additional Recommended Settings

Enable:

- [x] **Require conversation resolution before merging**
  - Ensures all review comments are addressed

- [x] **Require linear history**
  - Prevents merge commits, enforces rebase or squash merge
  - Creates cleaner git history

- [x] **Do not allow bypassing the above settings**
  - Enforces rules even for administrators
  - **Strongly recommended** to prevent accidental bypasses

**Why:** Maintains code quality and prevents shortcuts

### 4. Create Protection Rule for `develop` Branch

Repeat steps 2-3 for the `develop` branch:

1. Click **Add branch protection rule**
2. **Branch name pattern**: `develop`
3. Apply identical settings as configured for `main`

**Why:** Ensures consistency across integration and main branches

### 5. Save Configuration

1. Review all settings carefully
2. Click **Create** (for new rule) or **Save changes** (for existing rule)
3. Verify the protection rule appears in the list

## Verification Process

After configuration, verify the protection works correctly:

### Test 1: Create a Failing Migration

1. Create a test branch:

   ```bash
   git checkout -b test/migration-blocking
   ```

2. Create an intentionally invalid migration:

   ```bash
   cat > backend/src/main/resources/db/migration/V8__test_invalid.sql <<'EOF'
   -- Intentionally invalid SQL to test blocking
   CREATE TABL invalid_syntax (  -- TABL instead of TABLE
       id UUID PRIMARY KEY
   );
   EOF
   ```

3. Commit and push:

   ```bash
   git add backend/src/main/resources/db/migration/V8__test_invalid.sql
   git commit -m "test: add invalid migration to verify blocking"
   git push -u origin test/migration-blocking
   ```

4. Open a pull request to `main` or `develop`

### Test 2: Verify Blocking Behavior

On the PR page, you should see:

```
❌ Some checks were not successful

Migration Validation — Failed
  Flyway validation error detected

⚠️ Merging is blocked
  Required status check "Migration Validation" has not passed
```

**Expected results:**

- ❌ Red X next to "Migration Validation"
- 🔒 **Merge pull request** button is **disabled/greyed out**
- Warning message: "Merging is blocked"

### Test 3: Fix and Verify Unblocking

1. Delete the invalid migration:

   ```bash
   git rm backend/src/main/resources/db/migration/V8__test_invalid.sql
   git commit -m "test: remove invalid migration"
   git push
   ```

2. GitHub Actions will automatically re-run
3. Verify:
   - ✅ Green checkmark next to "Migration Validation"
   - ✅ **Merge pull request** button is **enabled**

### Test 4: Clean Up

1. Close the test PR
2. Delete the test branch:
   ```bash
   git checkout main
   git branch -D test/migration-blocking
   git push origin --delete test/migration-blocking
   ```

## How Migration Validation Works

### CI/CD Pipeline Flow

When a PR is opened or updated:

```
1. GitHub Actions triggered
   ↓
2. All jobs run in parallel:
   - Build & Test
   - Code Coverage
   - Security Scan
   - Code Quality Check
   - Migration Validation ← Validates Flyway migrations
   ↓
3. Migration Validation Job:
   - Spins up PostgreSQL 15-alpine container
   - Runs `./mvnw flyway:info` (lists migrations)
   - Runs `./mvnw flyway:validate` (validates checksums and order)
   ↓
4. Job reports status to GitHub:
   - ✅ Success → PR can be merged
   - ❌ Failure → PR merge blocked
   ↓
5. GitHub enforces branch protection:
   - If Migration Validation = ✅ → Merge button enabled
   - If Migration Validation = ❌ → Merge button disabled
```

### What Gets Validated

The migration-validation job checks:

1. **Migration Naming** - Follows V{version}\_\_{description}.sql format
2. **Sequential Versions** - No gaps or out-of-order migrations
3. **Checksum Integrity** - No modifications to applied migrations
4. **SQL Syntax** - Valid PostgreSQL syntax
5. **Migration Order** - Correct execution sequence

## Common Scenarios

### Scenario 1: Developer Modifies Applied Migration

**What happens:**

```
❌ Migration Validation — Failed
Checksum mismatch for migration V5__create_indexes.sql
```

**Why blocked:** Modifying applied migrations changes their checksum, causing validation failure

**Resolution:** Revert changes or create a new migration (V8) with corrections

### Scenario 2: Developer Skips Version Number

**What happens:**

```
❌ Migration Validation — Failed
Detected resolved migration not applied to database: V9
Out of order migration detected
```

**Why blocked:** Version V9 exists but V8 is missing (gap in sequence)

**Resolution:** Rename V9 to V8 or create the missing V8

### Scenario 3: SQL Syntax Error

**What happens:**

```
❌ Migration Validation — Failed
ERROR: syntax error at or near "TABL"
```

**Why blocked:** Invalid SQL in migration file

**Resolution:** Fix SQL syntax and push update

### Scenario 4: All Migrations Pass

**What happens:**

```
✅ Migration Validation — Passed
All migrations validated successfully
```

**Why allowed:** All validations passed, safe to merge

**Action:** Merge button is enabled, proceed with merge

## Bypassing Protection (Emergency Only)

### When Bypass is Justified

**Only bypass in these extreme situations:**

1. **Production Outage** - Critical hotfix needed immediately
2. **False Positive** - Validation failure is confirmed incorrect
3. **Technical Lead Approval** - Explicit approval obtained

**Document every bypass** with:

- Reason for bypass
- Who approved it
- Plan to fix properly
- Risk assessment

### Bypass Method 1: Temporary Rule Modification (Preferred)

**Steps:**

1. **Settings** → **Branches** → Edit protection rule for the branch
2. Temporarily **uncheck** "Migration Validation" from required status checks
3. **Save changes**
4. Merge the PR immediately
5. **Immediately re-enable** "Migration Validation" in status checks
6. Document the bypass in PR comments

**Why preferred:** Explicit action with audit trail

### Bypass Method 2: Admin Override (Last Resort)

**Requirements:**

- Must be repository administrator
- "Do not allow bypassing" must be unchecked (not recommended)

**Steps:**

1. On the PR page, admin will see "Bypass branch protections" option
2. Click to reveal **"Merge without waiting for requirements to be met"**
3. Provide detailed justification in comment
4. Merge the PR
5. Create follow-up issue to fix properly

**Why last resort:** Circumvents safety mechanisms, high risk

### Post-Bypass Actions (Mandatory)

After any bypass:

1. **Create follow-up issue** immediately
   - Title: "Fix migration validation failure bypassed in PR #XXX"
   - Priority: P0 (critical)
   - Assign to original developer

2. **Document in PR comments**:

   ```markdown
   ## ⚠️ Branch Protection Bypassed

   **Reason:** [Production outage / False positive / etc.]
   **Approved by:** @technical-lead-username
   **Risk Assessment:** [Describe risks]
   **Follow-up:** #XXX (issue to fix properly)
   ```

3. **Fix root cause** within 24 hours

4. **Post-mortem** if production impact

## Monitoring and Reporting

### View Protection Status

1. **Repository Settings** → **Branches**
2. View list of protection rules
3. Click rule to see configuration details

### Review Failed Checks

1. Go to **Actions** tab
2. Filter by workflow: "Backend CI"
3. Click failed run → "Migration Validation" job
4. Review error output and GitHub Actions summary

### Metrics to Track

Monitor these metrics over time:

- **Migration Validation Failure Rate** - % of PRs with failed validation
- **Average Time to Fix** - Time from failure to passing validation
- **Bypass Frequency** - Number of protection bypasses (should be near zero)
- **Most Common Failures** - Categorize by failure type

**Goal:** <5% failure rate, zero bypasses

## Best Practices

### For Developers

1. **Test migrations locally** before pushing:

   ```bash
   cd backend
   ./mvnw flyway:validate
   ./mvnw flyway:migrate
   ```

2. **Never modify applied migrations** - Always create new ones

3. **Review migration validation output** in every PR

4. **Keep migrations small and focused** - Easier to validate and rollback

### For Reviewers

1. **Always check migration validation status** before approving
2. **Review migration SQL** in addition to code changes
3. **Verify rollback instructions** in migration comments
4. **Question any bypass requests** - Require strong justification

### For Repository Admins

1. **Keep branch protection enabled** at all times
2. **Regularly audit protection rules** - Ensure no unauthorized changes
3. **Monitor bypass frequency** - Investigate if >0 per month
4. **Include administrators in protection** - No special privileges

## Troubleshooting

### Issue: Merge Button Still Enabled Despite Failure

**Possible causes:**

1. Branch protection not configured correctly
2. "Required status checks" doesn't include "Migration Validation"
3. Admin bypass setting is enabled

**Solution:**

1. Verify branch protection settings
2. Confirm exact status check name matches job name
3. Enable "Do not allow bypassing"

### Issue: Status Check Never Appears

**Possible causes:**

1. GitHub Actions workflow not triggering
2. Job name mismatch between workflow and protection rule
3. Workflow file syntax error

**Solution:**

1. Check workflow file `.github/workflows/backend-ci.yml`
2. Verify job name: `name: Migration Validation` (line 239)
3. Trigger workflow manually to test

### Issue: False Positives

**Possible causes:**

1. Checksum changes due to line ending differences (CRLF vs LF)
2. Migration file encoding issues
3. Flyway configuration mismatch

**Solution:**

1. Ensure `.gitattributes` normalizes line endings
2. Use UTF-8 encoding consistently
3. Verify Flyway configuration in `pom.xml` matches application.yml

## Related Documentation

- [Flyway Migration Guide](FLYWAY_MIGRATION_GUIDE.md) - Complete migration authoring guide
- [Backend CI Workflow](../.github/workflows/backend-ci.yml) - CI/CD pipeline configuration
- [GitHub Branch Protection Docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)

## Support and Questions

For help with PR merge blocking configuration:

1. Review this guide thoroughly
2. Check [Flyway Migration Guide](FLYWAY_MIGRATION_GUIDE.md) for migration best practices
3. Review recent PRs for similar configuration issues
4. Contact DevOps team for branch protection changes
5. Escalate to technical lead for bypass approval

---

**Last Updated:** 2025-10-04
**Maintained by:** Health Tracker DevOps Team
**Review Frequency:** Quarterly or when GitHub updates branch protection features
