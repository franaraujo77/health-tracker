# Claude Code Review Decision Tree

## Overview

This document explains when Claude Code review triggers versus skips based on the validation results from CI pipeline checks.

## Decision Tree Diagram (Detailed)

```mermaid
graph TD
    Start([PR Push Event]) --> CheckValidations{Are ALL<br/>validations passed?<br/><code>all_passed = true</code>}

    CheckValidations -->|Yes| CheckCritical{Any critical<br/>failures detected?<br/><code>has_critical_failures</code>}
    CheckValidations -->|No| SkipNonCritical[SKIP Claude Review]

    CheckCritical -->|No| TriggerReview[✅ TRIGGER Claude Review]
    CheckCritical -->|Yes| SkipCritical[❌ SKIP Claude Review]

    SkipNonCritical --> ExplainNonCritical[Reason: Not all validations passed<br/>Check error-report.json for details]
    SkipCritical --> ExplainCritical[Reason: Critical validation failures<br/>Must fix before review]
    TriggerReview --> Explain[All checks passed<br/>Code ready for AI review]

    style TriggerReview fill:#90EE90,stroke:#006400,stroke-width:3px,color:#000
    style SkipNonCritical fill:#FFB6C6,stroke:#8B0000,stroke-width:2px,color:#000
    style SkipCritical fill:#FFB6C6,stroke:#8B0000,stroke-width:2px,color:#000
    style CheckValidations fill:#FFE4B5,stroke:#FF8C00,stroke-width:2px,color:#000
    style CheckCritical fill:#FFE4B5,stroke:#FF8C00,stroke-width:2px,color:#000
    style Start fill:#87CEEB,stroke:#4682B4,stroke-width:2px,color:#000
    style Explain fill:#E0FFE0,stroke:#228B22,stroke-width:1px,color:#000
    style ExplainNonCritical fill:#FFE0E0,stroke:#DC143C,stroke-width:1px,color:#000
    style ExplainCritical fill:#FFE0E0,stroke:#DC143C,stroke-width:1px,color:#000
```

## Validation Categories Breakdown

```mermaid
graph TD
    Validations[CI/CD Validation Checks] --> Frontend[Frontend Validations]
    Validations --> Backend[Backend Validations]
    Validations --> Security[Security Validations]

    Frontend --> FE1[Type Check]
    Frontend --> FE2[Linting]
    Frontend --> FE3[Tests]
    Frontend --> FE4[Build]

    Backend --> BE1[Build]
    Backend --> BE2[Unit Tests]
    Backend --> BE3[Integration Tests]
    Backend --> BE4[Coverage Threshold]

    Security --> SEC1[Dependency Scan]
    Security --> SEC2[SAST Analysis]

    FE1 --> CritCheck1{Critical?}
    FE2 --> CritCheck2{Critical?}
    FE3 --> CritCheck3{Critical?}
    FE4 --> CritCheck4{Critical?}

    BE1 --> CritCheck5{Critical?}
    BE2 --> CritCheck6{Critical?}
    BE3 --> CritCheck7{Critical?}
    BE4 --> CritCheck8{Critical?}

    SEC1 --> CritCheck9{Critical?}
    SEC2 --> CritCheck10{Critical?}

    CritCheck1 -->|Yes| Crit1[✓ Type Check CRITICAL]
    CritCheck2 -->|No| NonCrit1[Linting Non-Critical]
    CritCheck3 -->|Yes| Crit2[✓ Tests CRITICAL]
    CritCheck4 -->|Yes| Crit3[✓ Build CRITICAL]

    CritCheck5 -->|Yes| Crit4[✓ Build CRITICAL]
    CritCheck6 -->|Yes| Crit5[✓ Unit Tests CRITICAL]
    CritCheck7 -->|Yes| Crit6[✓ Integration Tests CRITICAL]
    CritCheck8 -->|No| NonCrit2[Coverage Non-Critical]

    CritCheck9 -->|Yes| Crit7[✓ Dependency Scan CRITICAL]
    CritCheck10 -->|Yes| Crit8[✓ SAST CRITICAL]

    style Crit1 fill:#FFB6C6,stroke:#8B0000,stroke-width:2px,color:#000
    style Crit2 fill:#FFB6C6,stroke:#8B0000,stroke-width:2px,color:#000
    style Crit3 fill:#FFB6C6,stroke:#8B0000,stroke-width:2px,color:#000
    style Crit4 fill:#FFB6C6,stroke:#8B0000,stroke-width:2px,color:#000
    style Crit5 fill:#FFB6C6,stroke:#8B0000,stroke-width:2px,color:#000
    style Crit6 fill:#FFB6C6,stroke:#8B0000,stroke-width:2px,color:#000
    style Crit7 fill:#FFB6C6,stroke:#8B0000,stroke-width:2px,color:#000
    style Crit8 fill:#FFB6C6,stroke:#8B0000,stroke-width:2px,color:#000
    style NonCrit1 fill:#FFFACD,stroke:#FFD700,stroke-width:2px,color:#000
    style NonCrit2 fill:#FFFACD,stroke:#FFD700,stroke-width:2px,color:#000
```

## Simplified Flow Chart

```mermaid
flowchart LR
    A[PR Event] --> B{All Validations<br/>Passed?}
    B -->|No| C[❌ SKIP]
    B -->|Yes| D{Critical<br/>Failures?}
    D -->|Yes| E[❌ SKIP]
    D -->|No| F[✅ TRIGGER]

    C --> G[Fix validation errors]
    E --> H[Fix critical issues]
    F --> I[Claude reviews code]

    style F fill:#90EE90,stroke:#006400,stroke-width:3px,color:#000
    style C fill:#FFB6C6,stroke:#8B0000,stroke-width:2px,color:#000
    style E fill:#FFB6C6,stroke:#8B0000,stroke-width:2px,color:#000
    style B fill:#FFE4B5,stroke:#FF8C00,stroke-width:2px,color:#000
    style D fill:#FFE4B5,stroke:#FF8C00,stroke-width:2px,color:#000
```

## Decision Logic Implementation

### Current Implementation (from `claude-review-conditional.yml`)

```bash
# Primary decision logic
if [ "${ALL_PASSED}" = "true" ]; then
    echo "should_review=true"
else
    echo "should_review=false"
fi
```

### Input Variables (from `error-report.json`)

| Variable                | Type    | Description                              |
| ----------------------- | ------- | ---------------------------------------- |
| `all_passed`            | boolean | `true` if ALL validations passed         |
| `has_critical_failures` | boolean | `true` if any critical validation failed |
| `errors`                | array   | List of validation errors with severity  |

## Decision Scenarios

### Scenario 1: All Checks Pass ✅

```mermaid
sequenceDiagram
    participant PR as Pull Request
    participant CI as CI Pipeline
    participant Eval as Evaluate Job
    participant Claude as Claude Review

    PR->>CI: Push code
    CI->>CI: Run all validations
    CI->>Eval: all_passed=true<br/>has_critical_failures=false
    Eval->>Eval: Decision: should_review=true
    Eval->>Claude: Trigger Claude Review
    Claude->>PR: Post review comments
```

**Example error-report.json:**

```json
{
  "all_passed": true,
  "has_critical_failures": false,
  "errors": []
}
```

### Scenario 2: Non-Critical Failure (e.g., Linting) ❌

```mermaid
sequenceDiagram
    participant PR as Pull Request
    participant CI as CI Pipeline
    participant Eval as Evaluate Job
    participant Dev as Developer

    PR->>CI: Push code
    CI->>CI: Run all validations
    CI->>CI: Linting failed (non-critical)
    CI->>Eval: all_passed=false<br/>has_critical_failures=false
    Eval->>Eval: Decision: should_review=false
    Eval->>PR: Skip Claude Review
    PR->>Dev: Fix linting issues
```

**Example error-report.json:**

```json
{
  "all_passed": false,
  "has_critical_failures": false,
  "errors": [
    {
      "validation": "frontend-lint",
      "severity": "warning",
      "message": "ESLint found 3 warnings"
    }
  ]
}
```

### Scenario 3: Critical Failure (e.g., Build Failed) ❌

```mermaid
sequenceDiagram
    participant PR as Pull Request
    participant CI as CI Pipeline
    participant Eval as Evaluate Job
    participant Dev as Developer

    PR->>CI: Push code
    CI->>CI: Run all validations
    CI->>CI: Build failed (CRITICAL)
    CI->>Eval: all_passed=false<br/>has_critical_failures=true
    Eval->>Eval: Decision: should_review=false
    Eval->>PR: Skip Claude Review
    PR->>Dev: Fix build errors immediately
```

**Example error-report.json:**

```json
{
  "all_passed": false,
  "has_critical_failures": true,
  "errors": [
    {
      "validation": "backend-build",
      "severity": "error",
      "message": "Maven build failed: compilation errors"
    }
  ]
}
```

## Critical vs Non-Critical Validations

### Critical Failures (Block Claude Review)

**Frontend:**

- ❌ Type Check Failed
- ❌ Tests Failed
- ❌ Build Failed

**Backend:**

- ❌ Build Failed
- ❌ Unit Tests Failed
- ❌ Integration Tests Failed

**Security:**

- ❌ Dependency Scan Failed
- ❌ SAST Failed

### Non-Critical Failures (Still Block Claude Review)

**Frontend:**

- ⚠️ Linting Failed

**Backend:**

- ⚠️ Coverage Threshold Not Met

> **Note:** While non-critical failures don't set `has_critical_failures=true`, they still cause `all_passed=false`, which blocks Claude review.

## Future Enhancements (Not Yet Implemented)

The following conditions are **NOT** currently implemented but may be added:

```mermaid
graph TD
    Future[Future Enhancements] --> Draft[Draft PR Detection]
    Future --> Labels[Label-based Skipping]
    Future --> Files[File Pattern Filtering]
    Future --> Size[PR Size Limits]
    Future --> Bot[Bot Detection]

    Draft -.->|Not Implemented| DraftSkip[Skip if PR is draft]
    Labels -.->|Not Implemented| LabelSkip[Skip if 'skip-review' label]
    Files -.->|Not Implemented| FileSkip[Skip if only docs changed]
    Size -.->|Not Implemented| SizeSkip[Skip if >500 files changed]
    Bot -.->|Not Implemented| BotSkip[Skip if author is bot]

    style Draft fill:#E8E8E8,stroke:#808080,stroke-width:1px,stroke-dasharray: 5 5,color:#000
    style Labels fill:#E8E8E8,stroke:#808080,stroke-width:1px,stroke-dasharray: 5 5,color:#000
    style Files fill:#E8E8E8,stroke:#808080,stroke-width:1px,stroke-dasharray: 5 5,color:#000
    style Size fill:#E8E8E8,stroke:#808080,stroke-width:1px,stroke-dasharray: 5 5,color:#000
    style Bot fill:#E8E8E8,stroke:#808080,stroke-width:1px,stroke-dasharray: 5 5,color:#000
```

## Debugging: Why Was My Review Skipped?

### Step 1: Check CI Pipeline Status

```bash
# Navigate to GitHub Actions
# Find your PR's "Claude Code Review (Conditional)" workflow
# Click on the "evaluate" job
```

### Step 2: Examine error-report.json

```bash
# Download the error report artifact from the workflow run
# Or check the evaluate job logs for the JSON content
```

### Step 3: Identify Failed Validations

```mermaid
graph TD
    Debug[Review Skipped?] --> Check1{Check all_passed<br/>in error-report.json}
    Check1 -->|false| Check2[Look at errors array]
    Check1 -->|true| Check3{Check has_critical_failures}

    Check2 --> List[List all failed validations]
    List --> Fix[Fix each failed validation]

    Check3 -->|true| Critical[Critical failures detected]
    Check3 -->|false| Unexpected[Unexpected state - check logs]

    Critical --> FixCritical[Fix critical issues first]

    style Check1 fill:#FFE4B5,stroke:#FF8C00,stroke-width:2px,color:#000
    style Check3 fill:#FFE4B5,stroke:#FF8C00,stroke-width:2px,color:#000
```

### Step 4: Common Issues and Solutions

| Issue                 | Diagnosis                             | Solution                                       |
| --------------------- | ------------------------------------- | ---------------------------------------------- |
| Frontend build failed | `frontend-build` in errors            | Run `npm run build` locally, fix errors        |
| Backend tests failed  | `backend-test` in errors              | Run `mvn test` locally, fix failing tests      |
| Linting issues        | `frontend-lint` in errors             | Run `npm run lint` and fix warnings            |
| Type errors           | `frontend-typecheck` in errors        | Run `npm run typecheck`, fix TypeScript errors |
| Security scan failed  | `dependency-scan` or `sast` in errors | Review security report, update dependencies    |
| Coverage too low      | `backend-coverage` in errors          | Add more tests to increase coverage            |

## Quick Reference

### ✅ When Claude Review TRIGGERS

```
all_passed = true
AND
has_critical_failures = false
```

### ❌ When Claude Review SKIPS

```
all_passed = false
OR
has_critical_failures = true
```

## Related Files

- **Workflow:** `/Users/francisaraujo/repos/health-tracker/.github/workflows/claude-review-conditional.yml`
- **Validation Reports:** CI artifacts `error-report.json`
- **Skip Logic:** `evaluate` job in claude-review-conditional.yml

---

**Last Updated:** 2025-10-19
**Status:** Current Implementation (v1.0)
