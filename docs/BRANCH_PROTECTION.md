# Branch Protection Rules Configuration Guide

This guide provides instructions for configuring GitHub branch protection rules to enforce linting and code quality checks before merging to protected branches.

## Overview

Branch protection rules ensure that all code merged to `main` and `develop` branches passes automated quality checks, including ESLint, Prettier, and Stylelint validation.

## Required Status Checks

The following status checks from the `lint-and-format.yml` workflow must pass before PRs can be merged:

1. **ESLint Check** (`eslint-check`)
2. **Prettier Format Check** (`prettier-check`)
3. **Stylelint Check** (`stylelint-check`)

Additionally, the comprehensive `Frontend CI` workflow checks should also be required:

4. **Lint, Test & Build** (from `frontend-ci.yml`)

## Configuration Steps

### Via GitHub Web UI

1. **Navigate to Repository Settings**
   - Go to `https://github.com/<org>/<repo>/settings`
   - Click **Branches** in the left sidebar

2. **Add Branch Protection Rule for `main`**
   - Click **Add rule** or **Add branch protection rule**
   - Branch name pattern: `main`

3. **Configure Protection Settings**

   ✅ **Require a pull request before merging**
   - Check this box to enforce PR workflow
   - Recommended: Require approvals (at least 1)

   ✅ **Require status checks to pass before merging**
   - Check this box
   - Check **Require branches to be up to date before merging**

   ✅ **Status checks that are required:**
   - Search and select: `eslint-check`
   - Search and select: `prettier-check`
   - Search and select: `stylelint-check`
   - Search and select: `Lint, Test & Build`

   ✅ **Do not allow bypassing the above settings**
   - Recommended: Check this to prevent force pushes

   Optional but recommended:
   - ✅ Require linear history
   - ✅ Include administrators (applies rules to admins too)

4. **Save Changes**
   - Click **Create** or **Save changes**

5. **Repeat for `develop` Branch**
   - Follow the same steps for `develop` branch
   - Apply identical protection settings

### Via GitHub API

You can also configure branch protection using the GitHub API:

```bash
# Set branch protection for main
curl -X PUT \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/branches/main/protection \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": [
        "eslint-check",
        "prettier-check",
        "stylelint-check",
        "Lint, Test & Build"
      ]
    },
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "required_approving_review_count": 1
    },
    "restrictions": null,
    "allow_force_pushes": false,
    "allow_deletions": false
  }'
```

### Via Terraform (Infrastructure as Code)

If using Terraform to manage GitHub resources:

```hcl
resource "github_branch_protection" "main" {
  repository_id = github_repository.repo.node_id
  pattern       = "main"

  required_status_checks {
    strict = true
    contexts = [
      "eslint-check",
      "prettier-check",
      "stylelint-check",
      "Lint, Test & Build"
    ]
  }

  required_pull_request_reviews {
    required_approving_review_count = 1
  }

  enforce_admins = true
}

resource "github_branch_protection" "develop" {
  repository_id = github_repository.repo.node_id
  pattern       = "develop"

  required_status_checks {
    strict = true
    contexts = [
      "eslint-check",
      "prettier-check",
      "stylelint-check",
      "Lint, Test & Build"
    ]
  }

  required_pull_request_reviews {
    required_approving_review_count = 1
  }

  enforce_admins = true
}
```

## Verification

After configuration, verify branch protection is working:

1. **Create Test PR with Violations**
   ```bash
   # Create branch with linting violations
   git checkout -b test/branch-protection

   # Add code with intentional violations
   echo "const x = 5" > frontend/src/test.ts  # Missing semicolon
   git add frontend/src/test.ts
   git commit -m "test: verify branch protection"
   git push origin test/branch-protection
   ```

2. **Open PR**
   - Create PR targeting `main` branch
   - Check status checks section

3. **Expected Behavior**
   - PR shows required status checks
   - ESLint check fails (missing semicolon)
   - **Merge button is disabled** with message: "Merging is blocked"
   - Message shows: "Required status check 'eslint-check' has not succeeded"

4. **Fix and Verify**
   ```bash
   # Fix the violation
   echo "const x = 5;" > frontend/src/test.ts
   git add frontend/src/test.ts
   git commit -m "fix: add missing semicolon"
   git push
   ```
   - Status checks re-run automatically
   - All checks pass
   - **Merge button becomes enabled**

## Emergency Override Permissions

For production emergencies, repository administrators can override branch protection:

**Who Can Override:**
- Repository owners
- Organization owners
- Users with admin permissions (if "Include administrators" is unchecked)

**How to Override:**
1. Navigate to PR that needs emergency merge
2. Click **Merge pull request** dropdown
3. Select **Merge without waiting for requirements to be met** (only visible to admins)
4. Provide justification in merge commit message
5. **Fix violations immediately after merge**

**Emergency Override Checklist:**
- [ ] Production is down or critical bug exists
- [ ] Fix has been reviewed by at least one other developer
- [ ] Justification documented in merge commit
- [ ] Follow-up issue created to fix violations
- [ ] Post-mortem scheduled to prevent future occurrences

## Status Check Details

### ESLint Check (`eslint-check`)
- **What it checks:** TypeScript/JavaScript code quality, type safety, React hooks rules, accessibility, security
- **Runs:** On every PR with frontend changes
- **Failure reasons:** Type errors, unused variables, security issues, accessibility violations

### Prettier Format Check (`prettier-check`)
- **What it checks:** Code formatting consistency
- **Runs:** On every PR with frontend changes
- **Failure reasons:** Inconsistent indentation, line length, quote style, semicolons

### Stylelint Check (`stylelint-check`)
- **What it checks:** CSS code quality, property ordering, M3 token usage
- **Runs:** On every PR with frontend changes
- **Failure reasons:** CSS syntax errors, wrong property order, hardcoded colors/spacing

### Lint, Test & Build (`Lint, Test & Build`)
- **What it checks:** Comprehensive validation including all linting, tests, type-check, and build
- **Runs:** On every PR with frontend changes
- **Failure reasons:** Any of the above plus test failures or build errors

## Troubleshooting

### Issue: Status Checks Not Appearing

**Cause:** Workflow hasn't run yet on the PR

**Solution:**
1. Ensure PR has changes in `frontend/**` directory
2. Wait for workflow to start (may take 10-30 seconds)
3. Check **Checks** tab in PR for workflow status

### Issue: Can't Find Status Check in Settings

**Cause:** Status check hasn't run at least once on a PR

**Solution:**
1. Create and push a PR to trigger the workflow
2. After workflow completes, status check appears in settings
3. Return to branch protection settings and select it

### Issue: Merge Button Still Enabled Despite Failures

**Cause:** Branch protection not configured or "Do not allow bypassing" unchecked

**Solution:**
1. Verify branch protection rule exists for the target branch
2. Check "Do not allow bypassing the above settings" is enabled
3. Ensure you're not a repository admin (admins can bypass if "Include administrators" is unchecked)

### Issue: Status Checks Always Fail

**Cause:** Existing code violations in codebase

**Solution:**
1. Run linters locally: `npm run lint && npm run lint:css && npm run format:check`
2. Fix all violations: `npm run lint -- --fix && npm run lint:css -- --fix && npm run format`
3. Commit fixes and push

## Best Practices

### DO:
✅ Apply branch protection to both `main` and `develop` branches
✅ Require at least one PR approval in addition to status checks
✅ Enable "Require branches to be up to date before merging"
✅ Include administrators in branch protection rules
✅ Document override procedures for emergencies
✅ Periodically audit and update required status checks

### DON'T:
❌ Bypass branch protection routinely
❌ Use force push to protected branches
❌ Disable checks temporarily "just this once"
❌ Grant admin permissions to bypass to too many users
❌ Skip required checks in CI configuration
❌ Allow direct pushes to protected branches

## Maintenance

### Adding New Status Checks

When adding new required checks:

1. First add the check to CI workflow
2. Run it on several PRs to verify stability
3. Update branch protection rules to include new check
4. Announce to team via Slack/email
5. Update this documentation

### Removing Status Checks

When removing checks:

1. Remove from branch protection rules first
2. Update CI workflows
3. Announce change to team
4. Update this documentation

## Related Documentation

- [Linting Infrastructure Guide](./LINTING.md)
- [CI/CD Pipeline Documentation](../.github/workflows/README.md)
- [Pre-commit Hooks Guide](./linting/pre-commit-hooks.md)

## Support

For issues with branch protection:

1. Check this guide first
2. Verify branch protection settings in GitHub UI
3. Test with a fresh PR
4. Contact DevOps team in #devops Slack channel
5. Tag @devops-lead for urgent issues

---

**Last Updated:** 2025-10-20
**Maintained By:** DevOps Team
**Version:** 1.0.0
