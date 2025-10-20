# Technical Documentation - Validation Orchestrator CI/CD Pipeline

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Workflow Files Documentation](#workflow-files-documentation)
- [Validation Orchestration Mechanism](#validation-orchestration-mechanism)
- [Conditional Trigger Logic](#conditional-trigger-logic)
- [Error Reporting Flow](#error-reporting-flow)
- [Configuration Reference](#configuration-reference)
- [Code Examples](#code-examples)
- [FAQ](#faq)

---

## Architecture Overview

### System Design Principles

The Validation Orchestrator CI/CD pipeline is built on these core principles:

1. **Separation of Concerns**: Each validation workflow is independent and focused on a single domain
2. **Parallel Execution**: All validations run simultaneously to minimize total execution time
3. **Conditional Gating**: Claude Code review triggers only when all validations pass
4. **Comprehensive Reporting**: Detailed status updates posted to pull requests
5. **Artifact-Based Communication**: Workflows communicate via JSON artifacts

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Events Layer                       │
│              (Pull Request Created/Updated)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Orchestration Layer                         │
│              validation-orchestrator.yml                     │
│    • Triggers parallel validations                          │
│    • Aggregates results                                     │
│    • Creates error reports                                  │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Frontend CI     │ │   Backend CI     │ │   Security       │
│  • Linting       │ │   • Build        │ │   • Dep Scan     │
│  • Type Check    │ │   • Unit Tests   │ │   • SAST         │
│  • Tests         │ │   • Integration  │ │                  │
│  • Build         │ │   • Coverage     │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
            │                 │                 │
            └─────────────────┼─────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Aggregation Layer                           │
│               aggregate-results Job                          │
│    • Collects validation outputs                            │
│    • Determines overall status                              │
│    • Creates error-report.json                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Reporting Layer                             │
│              post-status-comment Job                         │
│    • Generates markdown report                              │
│    • Posts/updates PR comment                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Conditional Review Layer                        │
│           claude-review-conditional.yml                      │
│    • Evaluates validation results                           │
│    • Triggers Claude review if all passed                   │
│    • Posts skip notification if failed                      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
PR Event → Orchestrator → [Frontend, Backend, Security] (parallel)
                          ↓
                    Outputs collected
                          ↓
                  all_passed: boolean
                  has_critical_failures: boolean
                  errors: array
                          ↓
                  error-report.json artifact
                          ↓
              Claude Review Decision Logic
                          ↓
                ┌─────────┴─────────┐
                │                   │
          all_passed=true    all_passed=false
                │                   │
          Trigger Review      Skip Review
```

### Key Components

#### 1. Validation Workflows (Reusable)

- **Frontend CI**: `frontend-ci.yml`
- **Backend CI**: `backend-ci.yml`
- **Security Validation**: `security-validation.yml`

Each workflow:

- Accepts `workflow_call` trigger
- Defines structured outputs
- Runs domain-specific checks
- Returns success/failure status

#### 2. Orchestrator Workflow

- **File**: `validation-orchestrator.yml`
- **Trigger**: `pull_request` on `main` branch
- **Purpose**: Coordinate all validations and reporting

#### 3. Conditional Review Workflow

- **File**: `claude-review-conditional.yml`
- **Trigger**: `workflow_run` on orchestrator completion
- **Purpose**: Gate Claude Code review execution

---

## Workflow Files Documentation

### validation-orchestrator.yml

**Purpose**: Main orchestration workflow that triggers parallel validations, aggregates results, and posts status comments.

**Trigger Configuration**:

```yaml
on:
  pull_request:
    branches:
      - main
    paths-ignore:
      - '**.md'
      - 'docs/**'
```

**Jobs**:

1. **frontend-ci** (calls frontend-ci.yml)
   - Outputs: `lintStatus`, `typeStatus`, `testStatus`, `buildStatus`

2. **backend-ci** (calls backend-ci.yml)
   - Outputs: `buildStatus`, `unitTestStatus`, `integrationTestStatus`, `coverageStatus`

3. **security-validation** (calls security-validation.yml)
   - Outputs: `dependencyScanStatus`, `sastStatus`

4. **aggregate-results**
   - Depends on: All validation jobs
   - Creates: `error-report.json` artifact
   - Outputs: `all_passed`, `has_critical_failures`, `errors`

5. **post-status-comment**
   - Depends on: `aggregate-results`
   - Posts validation status to PR

**Key Features**:

- Parallel execution of all validations
- Non-blocking (uses `if: always()` for aggregation)
- Artifact retention: 30 days
- PR write permissions for status comments

---

### frontend-ci.yml

**Purpose**: Frontend validation pipeline covering code quality, type safety, tests, and build.

**Trigger Configuration**:

```yaml
on:
  workflow_call:
    outputs:
      lintStatus:
        value: ${{ jobs.frontend-validation.outputs.lintStatus }}
      typeStatus:
        value: ${{ jobs.frontend-validation.outputs.typeStatus }}
      testStatus:
        value: ${{ jobs.frontend-validation.outputs.testStatus }}
      buildStatus:
        value: ${{ jobs.frontend-validation.outputs.buildStatus }}
```

**Validation Steps** (in order):

1. **Linting** (`npm run lint`)
   - Severity: Non-critical (warning)
   - Checks: ESLint rules, code style
   - Output: `lintStatus`

2. **Type Checking** (`npm run type-check`)
   - Severity: Critical
   - Checks: TypeScript compilation errors
   - Output: `typeStatus`

3. **Unit Tests** (`npm test`)
   - Severity: Critical
   - Checks: Vitest test suites
   - Output: `testStatus`

4. **Build** (`npm run build`)
   - Severity: Critical
   - Checks: Production build success
   - Output: `buildStatus`

**Environment**:

- Node.js: 20.x
- Cache: npm dependencies
- Working Directory: `frontend/`

---

### backend-ci.yml

**Purpose**: Backend validation pipeline covering compilation, testing, and coverage.

**Trigger Configuration**:

```yaml
on:
  workflow_call:
    outputs:
      buildStatus:
        value: ${{ jobs.backend-validation.outputs.buildStatus }}
      unitTestStatus:
        value: ${{ jobs.backend-validation.outputs.unitTestStatus }}
      integrationTestStatus:
        value: ${{ jobs.backend-validation.outputs.integrationTestStatus }}
      coverageStatus:
        value: ${{ jobs.backend-validation.outputs.coverageStatus }}
```

**Validation Steps** (in order):

1. **Build/Compile** (`mvn clean compile`)
   - Severity: Critical
   - Checks: Java compilation errors
   - Output: `buildStatus`

2. **Unit Tests** (`mvn test`)
   - Severity: Critical
   - Checks: JUnit test suites
   - Output: `unitTestStatus`

3. **Integration Tests** (`mvn verify`)
   - Severity: Critical
   - Checks: Integration test suites
   - Output: `integrationTestStatus`

4. **Coverage Check** (JaCoCo)
   - Severity: Non-critical (warning)
   - Checks: Code coverage thresholds
   - Output: `coverageStatus`

**Environment**:

- Java: 21
- Build Tool: Maven
- Working Directory: `backend/`

---

### security-validation.yml

**Purpose**: Security scanning pipeline for dependencies and static code analysis.

**Trigger Configuration**:

```yaml
on:
  workflow_call:
    outputs:
      dependencyScanStatus:
        value: ${{ jobs.security-checks.outputs.dependencyScanStatus }}
      sastStatus:
        value: ${{ jobs.security-checks.outputs.sastStatus }}
```

**Validation Steps** (in order):

1. **Dependency Scanning**
   - Severity: Critical
   - Checks: Known vulnerabilities in dependencies
   - Tool: GitHub Dependency Review
   - Output: `dependencyScanStatus`

2. **SAST Analysis**
   - Severity: Critical
   - Checks: Security issues in source code
   - Tool: CodeQL
   - Output: `sastStatus`

**Environment**:

- Scans: Both frontend and backend
- Language: JavaScript, Java

---

### claude-review-conditional.yml

**Purpose**: Conditionally trigger Claude Code review based on validation results.

**Trigger Configuration**:

```yaml
on:
  workflow_run:
    workflows: ['Validation Orchestrator']
    types:
      - completed
```

**Jobs**:

1. **evaluate**
   - Downloads `error-report.json` artifact
   - Reads validation results
   - Decides: `should_review=true/false`
   - Output: Decision for subsequent jobs

2. **claude-review** (conditional)
   - Condition: `needs.evaluate.outputs.should_review == 'true'`
   - Runs: Claude Code review
   - Posts: Review comments to PR

3. **skip-notification** (conditional)
   - Condition: `needs.evaluate.outputs.should_review == 'false'`
   - Posts: Skip notification to PR
   - Includes: Reason for skipping

**Decision Logic**:

```bash
if [ "${ALL_PASSED}" = "true" ]; then
  echo "should_review=true"
else
  echo "should_review=false"
fi
```

---

## Validation Orchestration Mechanism

### Reusable Workflow Pattern

The orchestrator uses GitHub Actions' `workflow_call` feature to create modular, reusable validation workflows.

**Benefits**:

- **DRY Principle**: Each validation defined once, reused everywhere
- **Maintainability**: Changes to validation logic in one place
- **Testability**: Each workflow can be tested independently
- **Scalability**: Easy to add new validation workflows

**Structure**:

```yaml
# In orchestrator (caller)
jobs:
  frontend-ci:
    uses: ./.github/workflows/frontend-ci.yml

# In validation workflow (callee)
on:
  workflow_call:
    outputs:
      lintStatus:
        value: ${{ jobs.frontend-validation.outputs.lintStatus }}
```

### Parallel Execution

All validation workflows execute simultaneously:

```
t=0s:  [Frontend] [Backend] [Security]  ← All start
t=120s: [Frontend✓] [Backend✓] [Security✓]  ← All complete
t=121s: [aggregate-results]  ← Starts after all finish
```

**Performance Impact**:

- Sequential: ~6-8 minutes
- Parallel: ~2-3 minutes (longest workflow duration)

### Output Collection

Each validation workflow defines structured outputs:

```yaml
outputs:
  lintStatus:
    description: 'Lint check result (success/failure/warning)'
    value: ${{ jobs.frontend-validation.outputs.lintStatus }}
```

The orchestrator collects these outputs:

```yaml
jobs:
  aggregate-results:
    needs: [frontend-ci, backend-ci, security-validation]
    steps:
      - name: Collect Results
        run: |
          echo "Frontend Lint: ${{ needs.frontend-ci.outputs.lintStatus }}"
          echo "Backend Build: ${{ needs.backend-ci.outputs.buildStatus }}"
```

### Non-Blocking Aggregation

The `aggregate-results` job uses `if: always()` to run even if validations fail:

```yaml
jobs:
  aggregate-results:
    needs: [frontend-ci, backend-ci, security-validation]
    if: always() # Run even if validations fail
```

This ensures:

- Complete error reporting
- PR status comments always posted
- No orphaned workflow runs

---

## Conditional Trigger Logic

### Decision Rules

Claude Code review triggers **ONLY** when:

```
all_passed = true AND has_critical_failures = false
```

Claude Code review skips when:

```
all_passed = false OR has_critical_failures = true
```

### Critical vs Non-Critical Validations

**Critical Validations** (block review):

- Frontend: Type Check, Tests, Build
- Backend: Build, Unit Tests, Integration Tests
- Security: Dependency Scan, SAST

**Non-Critical Validations** (warning only):

- Frontend: Linting
- Backend: Coverage Threshold

**Important**: Even non-critical failures cause `all_passed=false`, which blocks Claude review. The distinction is in reporting severity.

### Implementation

```bash
#!/bin/bash
# In evaluate job of claude-review-conditional.yml

# Download artifact
gh run download "${WORKFLOW_RUN_ID}" -n error-report

# Parse JSON
ALL_PASSED=$(jq -r '.all_passed' error-report.json)
HAS_CRITICAL=$(jq -r '.has_critical_failures' error-report.json)

# Decide
if [ "${ALL_PASSED}" = "true" ]; then
  echo "should_review=true" >> $GITHUB_OUTPUT
else
  echo "should_review=false" >> $GITHUB_OUTPUT
fi
```

### Conditional Job Execution

```yaml
jobs:
  claude-review:
    needs: evaluate
    if: needs.evaluate.outputs.should_review == 'true'
    steps:
      - name: Run Claude Code Review
        # Review steps...

  skip-notification:
    needs: evaluate
    if: needs.evaluate.outputs.should_review == 'false'
    steps:
      - name: Post Skip Comment
        # Notification steps...
```

### Skip Reasons

The system provides specific skip reasons:

1. **Critical Failures**:

   ```
   ❌ Claude Code review skipped due to critical validation failures.
   Please fix the following issues before review can proceed.
   ```

2. **Non-Critical Issues**:
   ```
   ⚠️ Claude Code review skipped due to validation issues.
   Please address the following before review.
   ```

---

## Error Reporting Flow

### Error Report Structure

**File**: `error-report.json`

```json
{
  "all_passed": false,
  "has_critical_failures": true,
  "errors": [
    {
      "validation": "frontend-typecheck",
      "severity": "critical",
      "message": "TypeScript compilation failed: 5 errors found",
      "details": "src/components/App.tsx:42:5 - error TS2322: Type 'string' is not assignable to type 'number'."
    },
    {
      "validation": "backend-test",
      "severity": "critical",
      "message": "Unit tests failed: 3 test(s) failed",
      "details": "AuthenticationControllerTest.testLoginSuccess() - Expected 200, got 401"
    },
    {
      "validation": "frontend-lint",
      "severity": "warning",
      "message": "ESLint found 12 warnings",
      "details": "src/utils/helpers.ts:23:10 - 'unused variable' warning"
    }
  ],
  "timestamp": "2025-10-19T20:30:45Z"
}
```

### Error Aggregation Logic

```bash
# In aggregate-results job

# Initialize
ALL_PASSED=true
HAS_CRITICAL=false
ERRORS=()

# Check each validation
if [ "${{ needs.frontend-ci.outputs.typeStatus }}" != "success" ]; then
  ALL_PASSED=false
  HAS_CRITICAL=true
  ERRORS+=('{"validation":"frontend-typecheck","severity":"critical",...}')
fi

if [ "${{ needs.frontend-ci.outputs.lintStatus }}" != "success" ]; then
  ALL_PASSED=false
  ERRORS+=('{"validation":"frontend-lint","severity":"warning",...}')
fi

# Create JSON
cat > error-report.json <<EOF
{
  "all_passed": ${ALL_PASSED},
  "has_critical_failures": ${HAS_CRITICAL},
  "errors": [${ERRORS[@]}],
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```

### Artifact Management

**Upload**:

```yaml
- name: Upload Error Report
  uses: actions/upload-artifact@v4
  with:
    name: error-report
    path: error-report.json
    retention-days: 30
```

**Download**:

```yaml
- name: Download Error Report
  uses: actions/download-artifact@v4
  with:
    name: error-report
    github-token: ${{ secrets.GITHUB_TOKEN }}
    run-id: ${{ github.event.workflow_run.id }}
```

### PR Status Comments

The `post-status-comment` job generates markdown reports:

**Success Report**:

```markdown
<!-- validation-status-reporter -->

## 🔍 Validation Status Report

✅ **All validations passed** - Claude Code review will be triggered.

| Stage        | Check             | Status     | Details                |
| ------------ | ----------------- | ---------- | ---------------------- |
| **Frontend** | Lint              | ✅ Success | No issues              |
| **Frontend** | Type Check        | ✅ Success | No errors              |
| **Frontend** | Tests             | ✅ Success | All passed             |
| **Frontend** | Build             | ✅ Success | Build successful       |
| **Backend**  | Build             | ✅ Success | Compilation successful |
| **Backend**  | Unit Tests        | ✅ Success | All tests passed       |
| **Backend**  | Integration Tests | ✅ Success | All tests passed       |
| **Backend**  | Coverage          | ✅ Success | 85% coverage           |
| **Security** | Dependency Scan   | ✅ Success | No vulnerabilities     |
| **Security** | SAST              | ✅ Success | No issues found        |

### Links

🔗 [View Full Workflow Run](#12345)

---

_This comment is automatically updated on each push._
```

**Failure Report**:

```markdown
<!-- validation-status-reporter -->

## 🔍 Validation Status Report

❌ **Critical failures detected** - Claude Code review will be skipped until issues are resolved.

**Issues**: 2 critical, 1 warnings

| Stage        | Check      | Status     | Details         |
| ------------ | ---------- | ---------- | --------------- |
| **Frontend** | Type Check | ❌ Failed  | 5 errors        |
| **Backend**  | Unit Tests | ❌ Failed  | 3 test failures |
| **Frontend** | Lint       | ⚠️ Warning | 12 warnings     |

<details>
<summary>💥 Critical Failures</summary>

#### Frontend: Type Check

TypeScript compilation failed: 5 errors found
```

src/components/App.tsx:42:5 - error TS2322

```

#### Backend: Unit Tests
Unit tests failed: 3 test(s) failed
```

AuthenticationControllerTest.testLoginSuccess() - Expected 200, got 401

```

</details>

<details>
<summary>⚠️ Warnings</summary>

#### Frontend: Lint
ESLint found 12 warnings
```

src/utils/helpers.ts:23:10 - 'unused variable' warning

```

</details>

### Links
🔗 [View Full Workflow Run](#12345)

---
*This comment is automatically updated on each push.*
```

### Comment Update Strategy

The system uses a **marker-based update** approach:

1. **Marker**: `<!-- validation-status-reporter -->`
2. **Search**: Find existing comment with marker
3. **Update**: If found, update in place; otherwise, create new comment

**Benefits**:

- Single comment per PR (not cluttered)
- Real-time status updates
- Historical context preserved

---

## Configuration Reference

### Environment Variables

#### Orchestrator Workflow

```yaml
env:
  NODE_VERSION: '20.x' # Node.js version for frontend
  JAVA_VERSION: '21' # Java version for backend
  ARTIFACT_RETENTION_DAYS: 30 # Error report retention
```

#### Frontend CI

```yaml
env:
  NODE_VERSION: '20.x'
  WORKING_DIRECTORY: 'frontend'
  LINT_MAX_WARNINGS: 0 # Fail on any warnings
```

#### Backend CI

```yaml
env:
  JAVA_VERSION: '21'
  WORKING_DIRECTORY: 'backend'
  MAVEN_OPTS: '-Xmx1024m' # Maven memory limit
  COVERAGE_THRESHOLD: 80 # Minimum coverage %
```

#### Security Validation

```yaml
env:
  CODEQL_LANGUAGE: 'javascript,java'
  DEPENDENCY_CHECK_FAIL_ON: 'moderate' # Severity threshold
```

### Permissions

#### Orchestrator

```yaml
permissions:
  contents: read
  pull-requests: write # For posting status comments
  checks: write # For check runs
```

#### Claude Review

```yaml
permissions:
  contents: read
  pull-requests: write # For posting review comments
  actions: read # For downloading artifacts
```

### Triggers

#### Pull Request Events

```yaml
on:
  pull_request:
    branches:
      - main
    paths-ignore:
      - '**.md' # Skip for markdown changes
      - 'docs/**' # Skip for documentation
    types:
      - opened
      - synchronize
      - reopened
```

#### Workflow Run Events

```yaml
on:
  workflow_run:
    workflows: ['Validation Orchestrator']
    types:
      - completed
```

### Concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true # Cancel outdated runs
```

This prevents duplicate runs and saves Actions minutes.

### Timeouts

```yaml
jobs:
  frontend-ci:
    timeout-minutes: 15 # Prevent stuck workflows

  backend-ci:
    timeout-minutes: 20 # Backend may take longer

  security-validation:
    timeout-minutes: 10
```

---

## Code Examples

### Example 1: Adding a New Validation Workflow

**Scenario**: Add E2E testing to the pipeline

**Step 1**: Create `e2e-testing.yml`

```yaml
name: E2E Testing

on:
  workflow_call:
    outputs:
      e2eStatus:
        description: 'E2E test result'
        value: ${{ jobs.e2e-tests.outputs.e2eStatus }}

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    outputs:
      e2eStatus: ${{ steps.run-e2e.outputs.status }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - name: Install Dependencies
        working-directory: frontend
        run: npm ci

      - name: Run E2E Tests
        id: run-e2e
        working-directory: frontend
        run: |
          if npm run test:e2e; then
            echo "status=success" >> $GITHUB_OUTPUT
          else
            echo "status=failure" >> $GITHUB_OUTPUT
            exit 1
          fi
```

**Step 2**: Update `validation-orchestrator.yml`

```yaml
jobs:
  # Add new job
  e2e-testing:
    uses: ./.github/workflows/e2e-testing.yml

  # Update aggregate-results to include new validation
  aggregate-results:
    needs: [frontend-ci, backend-ci, security-validation, e2e-testing]
    steps:
      - name: Aggregate Results
        run: |
          # Add E2E status check
          E2E_STATUS="${{ needs.e2e-testing.outputs.e2eStatus }}"

          if [ "${E2E_STATUS}" != "success" ]; then
            ALL_PASSED=false
            HAS_CRITICAL=true
            ERRORS+=('{"validation":"e2e","severity":"critical","message":"E2E tests failed"}')
          fi
```

**Step 3**: Update PR comment generation

In `.github/scripts/generate-status-comment.js`:

```javascript
function generateValidationTable(validationData) {
  const rows = [
    // ... existing rows ...

    // Add E2E row
    [
      '**E2E**',
      'E2E Tests',
      statusToEmoji(validationData.e2e?.e2eStatus),
      validationData.e2e?.e2eStatus || 'unknown',
    ],
  ];

  // ... rest of function
}
```

---

### Example 2: Customizing Decision Logic

**Scenario**: Allow non-critical linting failures but still trigger review

**Step 1**: Update `aggregate-results` in orchestrator

```yaml
- name: Aggregate Results
  run: |
    # Separate critical from non-critical
    CRITICAL_FAILED=false
    NON_CRITICAL_FAILED=false

    # Critical checks
    if [ "${{ needs.frontend-ci.outputs.typeStatus }}" != "success" ]; then
      CRITICAL_FAILED=true
    fi

    # Non-critical checks
    if [ "${{ needs.frontend-ci.outputs.lintStatus }}" != "success" ]; then
      NON_CRITICAL_FAILED=true
    fi

    # Set all_passed based on critical only
    if [ "${CRITICAL_FAILED}" = "false" ]; then
      ALL_PASSED=true
    else
      ALL_PASSED=false
    fi

    # Create report
    cat > error-report.json <<EOF
    {
      "all_passed": ${ALL_PASSED},
      "has_critical_failures": ${CRITICAL_FAILED},
      "has_non_critical_failures": ${NON_CRITICAL_FAILED},
      "errors": [...]
    }
    EOF
```

**Step 2**: Update `evaluate` job in `claude-review-conditional.yml`

```yaml
- name: Decide Review Trigger
  run: |
    ALL_PASSED=$(jq -r '.all_passed' error-report.json)
    HAS_CRITICAL=$(jq -r '.has_critical_failures' error-report.json)
    HAS_NON_CRITICAL=$(jq -r '.has_non_critical_failures' error-report.json)

    # Trigger review if no critical failures (even with non-critical issues)
    if [ "${HAS_CRITICAL}" = "false" ]; then
      echo "should_review=true" >> $GITHUB_OUTPUT

      # Add note about non-critical issues
      if [ "${HAS_NON_CRITICAL}" = "true" ]; then
        echo "review_note=Review triggered with non-critical warnings" >> $GITHUB_OUTPUT
      fi
    else
      echo "should_review=false" >> $GITHUB_OUTPUT
    fi
```

---

### Example 3: Manual Override

**Scenario**: Allow maintainers to force review despite failures

**Step 1**: Add workflow dispatch trigger

```yaml
# In claude-review-conditional.yml
on:
  workflow_run:
    workflows: ['Validation Orchestrator']
    types:
      - completed
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'PR number to review'
        required: true
      force:
        description: 'Force review despite failures'
        type: boolean
        default: false
```

**Step 2**: Update decision logic

```yaml
- name: Decide Review Trigger
  run: |
    # Check for manual override
    if [ "${{ github.event.inputs.force }}" = "true" ]; then
      echo "should_review=true" >> $GITHUB_OUTPUT
      echo "Manual override: Force review enabled" >> $GITHUB_STEP_SUMMARY
      exit 0
    fi

    # Normal decision logic
    ALL_PASSED=$(jq -r '.all_passed' error-report.json)
    if [ "${ALL_PASSED}" = "true" ]; then
      echo "should_review=true" >> $GITHUB_OUTPUT
    else
      echo "should_review=false" >> $GITHUB_OUTPUT
    fi
```

---

### Example 4: Notification Integrations

**Scenario**: Send Slack notification when review is skipped

**Step 1**: Add Slack notification step

```yaml
# In claude-review-conditional.yml
jobs:
  skip-notification:
    needs: evaluate
    if: needs.evaluate.outputs.should_review == 'false'
    steps:
      # ... existing steps ...

      - name: Send Slack Notification
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚨 Claude review skipped for PR #${{ github.event.pull_request.number }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*PR*: ${{ github.event.pull_request.title }}\n*Reason*: Validation failures\n*Link*: ${{ github.event.pull_request.html_url }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## FAQ

### General Questions

**Q: How long does the full validation pipeline take?**

A: Approximately 2-3 minutes with parallel execution. Sequential would take 6-8 minutes.

**Q: What happens if a validation workflow fails?**

A: The workflow fails but the orchestrator continues. The `aggregate-results` job (using `if: always()`) collects all results and creates an error report.

**Q: Can I run validations locally before pushing?**

A: Yes! See [Running Validations Locally](README.md#running-validations-locally) in the main README.

---

### Configuration Questions

**Q: How do I change the Node.js or Java version?**

A: Update the environment variables in each workflow file:

```yaml
# In frontend-ci.yml
env:
  NODE_VERSION: '20.x'  # Change this

# In backend-ci.yml
env:
  JAVA_VERSION: '21'    # Change this
```

**Q: How do I adjust coverage thresholds?**

A: Update the backend coverage configuration in `pom.xml`:

```xml
<configuration>
  <rules>
    <rule>
      <element>BUNDLE</element>
      <limits>
        <limit>
          <counter>LINE</counter>
          <value>COVEREDRATIO</value>
          <minimum>0.80</minimum>  <!-- Change this -->
        </limit>
      </limits>
    </rule>
  </rules>
</configuration>
```

**Q: Can I skip validations for certain PRs?**

A: Yes, use `paths-ignore` or add a skip label:

```yaml
on:
  pull_request:
    branches:
      - main
    paths-ignore:
      - 'docs/**'
      - '**.md'
```

---

### Troubleshooting Questions

**Q: Why is Claude review not triggering even though tests pass?**

A: Check these common issues:

1. Download the `error-report.json` artifact from the workflow run
2. Verify `all_passed: true` and `has_critical_failures: false`
3. Check if the `evaluate` job is setting `should_review=true`
4. Verify the `claude-review` job condition is met

**Q: How do I debug validation failures?**

A:

1. Click on the failing workflow run
2. Expand the failing job
3. Check the step logs for error details
4. Look for the error message in the PR comment
5. Download artifacts for detailed reports

**Q: What if the orchestrator workflow gets stuck?**

A: Workflows have timeout limits:

- Frontend CI: 15 minutes
- Backend CI: 20 minutes
- Security: 10 minutes

If stuck, cancel the workflow run and re-run it.

**Q: How do I see the error report artifact?**

A:

1. Go to the workflow run
2. Scroll to "Artifacts" section
3. Download `error-report` artifact
4. Extract and view `error-report.json`

---

### Advanced Questions

**Q: Can I use this system with branch protection rules?**

A: Yes! Add the orchestrator workflow as a required status check:

```
Repository Settings → Branches → Branch Protection Rules → main
→ Require status checks to pass before merging
→ Select: "Validation Orchestrator"
```

**Q: How do I add a new validation type?**

A: See [Example 1: Adding a New Validation Workflow](#example-1-adding-a-new-validation-workflow)

**Q: Can I customize the PR comment format?**

A: Yes! Edit `.github/scripts/generate-status-comment.js`:

```javascript
function generateStatusComment(validationReport, options = {}) {
  // Customize header
  const header = '## 🚀 My Custom Validation Report\n\n';

  // Customize summary
  const summary = generateCustomSummary(validationReport);

  // Return custom format
  return `${marker}\n${header}${summary}${table}${links}`;
}
```

**Q: How do I integrate with other CI/CD tools?**

A: The system outputs a standard JSON artifact (`error-report.json`) that can be consumed by any tool:

```bash
# Download artifact
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/actions/runs/RUN_ID/artifacts/ARTIFACT_ID/zip \
  -o error-report.zip

# Extract and parse
unzip error-report.zip
jq '.all_passed' error-report.json
```

**Q: Can I run validations on multiple branches?**

A: Yes, update the trigger configuration:

```yaml
on:
  pull_request:
    branches:
      - main
      - develop
      - 'release/**'
```

**Q: How do I handle monorepo scenarios?**

A: Use path filtering in each validation workflow:

```yaml
on:
  workflow_call:

jobs:
  frontend-validation:
    steps:
      - name: Check for Frontend Changes
        id: check
        run: |
          if git diff --name-only ${{ github.event.before }} ${{ github.sha }} | grep '^frontend/'; then
            echo "has_changes=true" >> $GITHUB_OUTPUT
          fi

      - name: Run Validations
        if: steps.check.outputs.has_changes == 'true'
        run: npm test
```

---

### Performance Questions

**Q: How can I speed up validations?**

A: Several strategies:

1. **Cache dependencies** (already implemented)
2. **Run tests in parallel** within each validation
3. **Use matrix builds** for multiple Node/Java versions
4. **Skip unchanged files** using path filters

Example matrix build:

```yaml
jobs:
  test:
    strategy:
      matrix:
        node: [18, 20, 22]
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
```

**Q: Do validations consume a lot of Actions minutes?**

A: Typical usage:

- Frontend: ~3-5 minutes
- Backend: ~5-7 minutes
- Security: ~2-3 minutes
- **Total**: ~10-15 minutes per PR

With concurrency control, outdated runs are cancelled, saving minutes.

**Q: Can I use self-hosted runners?**

A: Yes! Update each workflow:

```yaml
jobs:
  frontend-validation:
    runs-on: self-hosted # Instead of ubuntu-latest
```

---

### Security Questions

**Q: Are secrets exposed in error reports?**

A: No. The error report only contains:

- Validation status (success/failure)
- Error messages (sanitized)
- No environment variables or secrets

**Q: Who can trigger the manual override?**

A: Only users with `write` permission to the repository can trigger workflow_dispatch events.

**Q: Are artifacts encrypted?**

A: Yes, GitHub encrypts artifacts at rest and in transit. Artifacts are also scoped to the repository and require authentication to download.

**Q: How do I audit workflow executions?**

A: Use the GitHub audit log:

```
Repository Settings → Security → Audit log
```

Filter by:

- Action: `workflows.completed`
- Workflow: `Validation Orchestrator`

---

### Integration Questions

**Q: Can I integrate this with JIRA?**

A: Yes! Add a step to post to JIRA:

```yaml
- name: Update JIRA
  if: failure()
  run: |
    curl -X POST https://your-domain.atlassian.net/rest/api/2/issue \
      -H "Content-Type: application/json" \
      -u "${{ secrets.JIRA_USER }}:${{ secrets.JIRA_TOKEN }}" \
      -d '{
        "fields": {
          "project": {"key": "PROJ"},
          "summary": "CI failure in PR ${{ github.event.pull_request.number }}",
          "description": "Validation failed. See: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
        }
      }'
```

**Q: Can I use this with Dependabot PRs?**

A: Yes, but add special handling:

```yaml
jobs:
  aggregate-results:
    steps:
      - name: Auto-approve Dependabot
        if: github.actor == 'dependabot[bot]' && needs.*.result == 'success'
        run: |
          gh pr review --approve "${{ github.event.pull_request.number }}"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Appendix

### Related Documentation

- [Main README](README.md) - Workflow overview and local validation guide
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions
- [DevOps Runbook](RUNBOOK.md) - Operational procedures
- [Claude Review Decision Tree](../../docs/claude-review-decision-tree.md) - Visual decision logic

### Version History

- **v1.0** (2025-10-19): Initial implementation with validation orchestrator, conditional Claude review, and PR status reporting

### Contributing

When modifying the validation pipeline:

1. Test changes locally first
2. Update documentation in this file
3. Add examples if introducing new patterns
4. Update the changelog
5. Notify the team via Slack

### Support

For issues or questions:

- 🐛 **Bugs**: Create a GitHub issue
- 💬 **Questions**: Ask in `#devops` Slack channel
- 📧 **Urgent**: Email devops@company.com

---

**Last Updated**: 2025-10-19
**Maintained By**: DevOps Team
**Status**: Production
