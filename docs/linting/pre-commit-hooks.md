# Pre-commit Hooks Guide

This guide explains the pre-commit hooks setup in the Health Tracker project and how to work with them.

## What Are Pre-commit Hooks?

Pre-commit hooks are automated scripts that run before each `git commit` to ensure code quality standards are met. They act as a quality gate, preventing non-compliant code from entering the repository.

## Why Pre-commit Hooks?

**Benefits:**
- **Catch Issues Early**: Problems are detected before they reach CI/CD or code review
- **Faster Feedback Loop**: Get immediate feedback in your local environment
- **Save CI/CD Resources**: Fewer pipeline failures mean faster builds and lower costs
- **Enforce Standards**: 100% compliance guarantee—non-compliant code cannot be committed
- **Better Code Quality**: Automatic formatting and linting keep the codebase consistent

**Impact:**
- ⚡ Immediate feedback (seconds vs minutes in CI/CD)
- 💰 Reduced CI/CD costs (fewer failed builds)
- ✅ Zero commits violating linting rules
- 🚀 Faster development workflow

## How It Works

### The Stack

1. **Husky** (v9.1.7): Git hooks management tool
2. **lint-staged** (v15.5.2): Runs linters only on staged files for fast performance

### What Runs on Each Commit

When you run `git commit`, the following happens automatically:

```text
git commit
    ↓
Husky triggers
    ↓
lint-staged runs
    ↓
Has staged files?
    ↓
    ├─ Yes → Run linters on staged files only
    │           ↓
    │       All checks pass?
    │           ↓
    │       ├─ Yes → Commit succeeds ✅
    │       └─ No  → Commit blocked ❌
    └─ No  → Skip
```

### File-Specific Processing

| File Pattern | Tools Applied |
|--------------|---------------|
| `frontend/**/*.{js,jsx,ts,tsx}` | ESLint --fix → Prettier --write |
| `frontend/**/*.css` | Stylelint --fix → Prettier --write |
| `frontend/**/*.{json,md}` | Prettier --write |

**Key Points:**
- Only **staged files** are processed (fast performance)
- Tools run with `--fix` and `--write` flags (auto-fixes applied)
- If auto-fix resolves all issues, commit proceeds automatically
- If issues can't be auto-fixed, commit is blocked with error messages

## Installation & Setup

### For New Team Members

When you clone the repository and run `npm install`, Husky hooks are automatically installed via the `prepare` script in `package.json`.

```bash
git clone <repository>
cd health-tracker
npm install  # Hooks installed automatically
```

**Verification:**
```bash
# Check that .husky/pre-commit exists
ls -la .husky/pre-commit

# Should output: -rwxr-xr-x ... .husky/pre-commit
```

### Manual Reinstallation

If hooks aren't working, reinstall manually:

```bash
cd /Users/francisaraujo/repos/health-tracker
npm run prepare
```

## Usage

### Normal Workflow

Just commit as usual. Hooks run automatically:

```bash
git add .
git commit -m "feat: add new feature"
# Hooks run automatically here
```

**Example Output (Success):**
```
husky - pre-commit hook

✔ Preparing lint-staged...
✔ Running tasks for staged files...
  ✔ frontend/**/*.{js,jsx,ts,tsx} — 3 files
    ✔ eslint --fix
    ✔ prettier --write
  ✔ frontend/**/*.css — 2 files
    ✔ stylelint --fix
    ✔ prettier --write
✔ Applying modifications from tasks...
✔ Cleaning up temporary files...

[feat/my-feature abc1234] feat: add new feature
 5 files changed, 120 insertions(+), 45 deletions(-)
```

**Example Output (Failure):**
```
husky - pre-commit hook

✖ Running tasks for staged files...
  ✖ frontend/**/*.{js,jsx,ts,tsx} — 3 files
    ✖ eslint --fix

      /path/to/file.tsx
        12:5  error  'useState' is not defined  no-undef

✖ lint-staged failed

error Command failed with exit code 1.
```

### Emergency Bypass

**⚠️ Use sparingly and only in emergencies!**

If you need to commit code that fails linting checks (e.g., work-in-progress, emergency hotfix), you can bypass the hooks:

```bash
git commit --no-verify -m "WIP: emergency fix"
```

**When to use `--no-verify`:**
- ✅ Emergency production hotfixes
- ✅ Work-in-progress commits on feature branches
- ✅ Temporary debugging code
- ❌ **Never** to bypass legitimate linting errors on main/develop branches
- ❌ **Never** as a regular practice

**Note:** Even if you bypass pre-commit hooks, CI/CD will still catch violations and fail the build.

## Configuration

### lint-staged Configuration

Located in root `package.json`:

```json
{
  "lint-staged": {
    "frontend/**/*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "frontend/**/*.css": [
      "stylelint --fix",
      "prettier --write"
    ],
    "frontend/**/*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### Hook Script

Located at `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

## Troubleshooting

### Issue: Hooks Not Running

**Symptoms:** Commits succeed without any linting output

**Solutions:**
1. **Verify Husky is installed:**
   ```bash
   ls -la .husky/pre-commit
   # Should show executable file
   ```

2. **Check file permissions:**
   ```bash
   chmod +x .husky/pre-commit
   ```

3. **Reinstall hooks:**
   ```bash
   npm run prepare
   ```

4. **Check Git hooks path:**
   ```bash
   git config core.hooksPath
   # Should output: .husky
   ```

### Issue: Slow Performance

**Symptoms:** Pre-commit hook takes >10 seconds

**Solutions:**
1. **Only stage necessary files:**
   ```bash
   git add specific-file.ts
   # Instead of: git add .
   ```

2. **Check what's staged:**
   ```bash
   git status
   # Unstage large/unnecessary files
   ```

3. **Bypass for large commits (use sparingly):**
   ```bash
   git commit --no-verify
   ```

### Issue: "command not found: npx"

**Symptoms:** Error message about missing `npx`

**Solutions:**
1. **Ensure Node.js is installed:**
   ```bash
   node --version
   npm --version
   ```

2. **Reinstall Node.js** (if not installed)

3. **Update npm:**
   ```bash
   npm install -g npm@latest
   ```

### Issue: ESLint/Stylelint Errors Can't Be Auto-fixed

**Symptoms:** Commit fails with linting errors even after auto-fix

**Solutions:**
1. **Read the error messages carefully** - they usually indicate what needs manual fixing

2. **Fix issues manually:**
   ```bash
   # For ESLint errors
   cd frontend && npm run lint

   # For Stylelint errors
   cd frontend && npm run lint:css
   ```

3. **Common issues that require manual fixes:**
   - Missing imports (`no-undef`)
   - Unused variables (`no-unused-vars`)
   - Type errors (TypeScript)
   - Complex code style issues

4. **After fixing, stage and commit again:**
   ```bash
   git add .
   git commit -m "fix: resolve linting issues"
   ```

### Issue: Hooks Fail After Merging main

**Symptoms:** Hooks work on main but fail after merging

**Solutions:**
1. **Reinstall dependencies:**
   ```bash
   npm install
   ```

2. **Rebuild Husky:**
   ```bash
   npm run prepare
   ```

3. **Check for conflicts in package.json:**
   ```bash
   git diff HEAD package.json
   ```

### Issue: Husky Deprecation Warnings

**Symptoms:** Seeing warnings about Husky v10

**Status:** This is expected. We're using Husky v9.1.7 which shows deprecation warnings for the v9 format. The hooks still work correctly.

**Action:** No action needed currently. Migration to v10 format will be done in a future update.

## Performance Tips

### Only Process Changed Files

lint-staged already does this automatically! It only runs linters on **staged files**, not the entire codebase.

**Performance comparison:**
- **Full codebase lint**: ~30-60 seconds
- **lint-staged (5 files)**: ~2-5 seconds

### Commit Frequently with Smaller Changes

Smaller commits = fewer files to lint = faster hooks

```bash
# Good: Small, focused commits
git add src/components/Button.tsx
git commit -m "feat: add Button component"

git add src/components/Button.test.tsx
git commit -m "test: add Button tests"

# Slower: Large commit with many files
git add src/
git commit -m "feat: add all components"
```

## Integration with CI/CD

Pre-commit hooks are the **first line of defense**. CI/CD provides the **final enforcement**:

1. **Local (Pre-commit)**: Fast feedback, auto-fixes applied
2. **CI/CD**: Full codebase validation, blocks PR merges

Even if you bypass pre-commit hooks with `--no-verify`, CI/CD will still catch violations.

## Best Practices

### DO:
✅ Let hooks run normally on every commit
✅ Fix linting errors when they occur
✅ Keep commits small and focused for faster hooks
✅ Read error messages carefully—they guide you to the fix
✅ Use `--no-verify` only for legitimate emergencies

### DON'T:
❌ Routinely bypass hooks with `--no-verify`
❌ Commit large numbers of files at once
❌ Ignore linting errors and "fix them later"
❌ Disable hooks globally
❌ Add `--no-verify` to automated scripts

## FAQ

### Q: Can I disable pre-commit hooks permanently?

**A:** No, and you shouldn't. Pre-commit hooks are a team standard that ensures code quality. If hooks are causing issues, follow the troubleshooting guide above.

### Q: What if I'm working on a WIP feature and want to commit broken code?

**A:** Use `--no-verify` for WIP commits on feature branches, but fix all issues before creating a PR:

```bash
git commit --no-verify -m "WIP: experimental feature"
# Later, before PR:
git commit -m "feat: complete experimental feature"  # Hooks run normally
```

### Q: Why are my commits taking longer now?

**A:** Pre-commit hooks add a few seconds to each commit, but save much more time by:
- Preventing CI/CD failures (minutes saved)
- Reducing code review back-and-forth (hours saved)
- Catching bugs early (hours/days saved)

The trade-off is worth it!

### Q: Can I customize which files run which linters?

**A:** Yes! Edit the `lint-staged` configuration in root `package.json`. See the Configuration section above.

### Q: What happens if I bypass hooks and push to main?

**A:** The CI/CD pipeline will catch violations and fail the build. The PR will be blocked from merging until all checks pass.

## Additional Resources

- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- [Linting Infrastructure Guide](../LINTING.md)
- [Stylelint Setup Guide](./stylelint-setup.md)
- [Prettier Configuration](../../frontend/.prettierrc.json)

## Need Help?

1. Check this troubleshooting guide first
2. Run linters manually to see specific errors:
   ```bash
   cd frontend
   npm run lint
   npm run lint:css
   npm run format:check
   ```
3. Ask in Slack #frontend channel
4. Tag @frontend-lead for urgent hook issues
