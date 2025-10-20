# DevOps Runbook - Validation Orchestrator CI/CD Pipeline

## Table of Contents

- [Overview](#overview)
- [Workflow Update Procedures](#workflow-update-procedures)
- [Emergency Bypass Procedures](#emergency-bypass-procedures)
- [Threshold Adjustment Procedures](#threshold-adjustment-procedures)
- [Monitoring and Alerting Setup](#monitoring-and-alerting-setup)
- [Incident Response Procedures](#incident-response-procedures)
- [Rollback Procedures](#rollback-procedures)
- [Contact Information and Escalation Paths](#contact-information-and-escalation-paths)

---

## Overview

### Purpose

This runbook provides operational procedures for maintaining, troubleshooting, and recovering the Validation Orchestrator CI/CD pipeline system. It is intended for DevOps engineers, SREs, and on-call personnel.

### Scope

- Validation Orchestrator workflow (`validation-orchestrator.yml`)
- Frontend CI workflow (`frontend-ci.yml`)
- Backend CI workflow (`backend-ci.yml`)
- Security Validation workflow (`security-validation.yml`)
- Claude Review Conditional workflow (`claude-review-conditional.yml`)
- Supporting scripts in `.github/scripts/`

### System Architecture Quick Reference

```
PR Event → Orchestrator → Parallel Validations → Aggregate → Report → Claude Review (conditional)
```

### Key Metrics

- **Target Pipeline Duration**: 2-3 minutes
- **Success Rate Target**: >95%
- **Mean Time to Recovery (MTTR)**: <30 minutes
- **Incident Response SLA**: <15 minutes

---

## Workflow Update Procedures

### Standard Workflow Update Process

#### Prerequisites

- [ ] Changes tested in feature branch
- [ ] Peer review completed
- [ ] Change documented in changelog
- [ ] Rollback plan prepared
- [ ] Team notified in #devops channel

#### Procedure

**Step 1: Create Feature Branch**

```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b workflow/update-description

# Example: workflow/add-e2e-validation
```

**Step 2: Make Changes**

```bash
# Edit workflow files
cd .github/workflows
vim validation-orchestrator.yml  # or frontend-ci.yml, etc.

# Edit supporting scripts if needed
cd ../scripts
vim generate-status-comment.js
```

**Step 3: Test Changes**

```bash
# Option 1: Test with workflow_dispatch trigger
# Add to workflow file:
on:
  workflow_dispatch:
    inputs:
      test_mode:
        description: 'Test mode'
        default: 'true'

# Trigger manually via GitHub UI or CLI
gh workflow run validation-orchestrator.yml
```

```bash
# Option 2: Test in draft PR
git add .
git commit -m "feat(ci): add new validation step"
git push origin workflow/update-description

# Create draft PR
gh pr create --draft --title "Test: Workflow update" --body "Testing workflow changes"

# Monitor workflow run
gh run watch
```

**Step 4: Deploy to Production**

```bash
# After testing passes, mark PR as ready
gh pr ready

# Request reviews
gh pr edit --add-reviewer @devops-team

# After approval, merge
gh pr merge --squash
```

**Step 5: Monitor Post-Deployment**

```bash
# Watch next few PRs for issues
gh run list --branch main --limit 10

# Check error rate
gh api /repos/OWNER/REPO/actions/runs \
  | jq '[.workflow_runs[] | select(.conclusion == "failure")] | length'
```

**Step 6: Document Changes**

```bash
# Update changelog
echo "- $(date +%Y-%m-%d): Updated validation-orchestrator.yml - Added E2E validation" >> CHANGELOG.md

# Update documentation if needed
vim .github/workflows/TECHNICAL.md
vim .github/workflows/README.md
```

### Emergency Hotfix Procedure

For critical production issues requiring immediate fix:

**Step 1: Assess Impact**

```bash
# Check current failure rate
gh api /repos/OWNER/REPO/actions/runs \
  --jq '.workflow_runs[0:20] | map(select(.conclusion == "failure")) | length'

# If >50% failing, proceed with hotfix
```

**Step 2: Apply Hotfix**

```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-issue-description

# Make minimal changes
vim .github/workflows/validation-orchestrator.yml

# Commit and push
git add .
git commit -m "hotfix(ci): fix critical validation failure"
git push origin hotfix/critical-issue-description
```

**Step 3: Fast-Track Review**

```bash
# Create PR with HOTFIX label
gh pr create \
  --title "HOTFIX: Critical validation failure" \
  --body "**Impact**: 60% of PRs failing\n**Fix**: Corrected artifact download step\n**Risk**: Low - reverting to known working state" \
  --label "hotfix,priority:critical"

# Request immediate review
# Slack: @devops-oncall in #devops channel
# Phone: Call on-call engineer if no response in 5 mins
```

**Step 4: Deploy and Monitor**

```bash
# After approval, merge immediately
gh pr merge --squash

# Monitor next 5 workflow runs
for i in {1..5}; do
  echo "Checking run $i..."
  gh run list --branch main --limit 1 --json conclusion
  sleep 60
done
```

**Step 5: Post-Incident Review**

- Document incident in `incidents/YYYY-MM-DD-description.md`
- Schedule post-mortem within 24 hours
- Update runbook with lessons learned

### Adding New Validation Workflow

**Step 1: Create Reusable Workflow**

```bash
# Create new workflow file
cat > .github/workflows/e2e-validation.yml <<'EOF'
name: E2E Validation

on:
  workflow_call:
    outputs:
      e2eStatus:
        description: "E2E test result"
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

      - name: Run E2E Tests
        id: run-e2e
        run: |
          cd frontend
          if npm run test:e2e; then
            echo "status=success" >> $GITHUB_OUTPUT
          else
            echo "status=failure" >> $GITHUB_OUTPUT
            exit 1
          fi
EOF
```

**Step 2: Update Orchestrator**

```yaml
# In validation-orchestrator.yml

jobs:
  # Add new job
  e2e-validation:
    uses: ./.github/workflows/e2e-validation.yml

  # Update aggregate-results dependency
  aggregate-results:
    needs: [frontend-ci, backend-ci, security-validation, e2e-validation]
    # ... rest of job
```

**Step 3: Update Aggregation Logic**

```bash
# In aggregate-results job
- name: Aggregate Results
  run: |
    # Add E2E status check
    E2E_STATUS="${{ needs.e2e-validation.outputs.e2eStatus }}"

    if [ "${E2E_STATUS}" != "success" ]; then
      ALL_PASSED=false
      HAS_CRITICAL=true
      ERRORS+=('{"validation":"e2e","severity":"critical","message":"E2E tests failed"}')
    fi
```

**Step 4: Update Status Reporter**

```javascript
// In .github/scripts/generate-status-comment.js

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

**Step 5: Test and Deploy**

Follow standard workflow update process above.

### Modifying Validation Thresholds

See [Threshold Adjustment Procedures](#threshold-adjustment-procedures) section.

---

## Emergency Bypass Procedures

### When to Use Emergency Bypass

Emergency bypass should **ONLY** be used in these scenarios:

1. **Critical Production Hotfix**: Production is down, fix ready, but CI is broken
2. **CI Infrastructure Outage**: GitHub Actions/npm/Maven Central down
3. **False Positive Blocking Release**: Validation failing due to known bug in test/tool

**⚠️ WARNING**: Emergency bypass circumvents quality gates. Use with extreme caution.

### Approval Required

Emergency bypass requires approval from:

- **Primary**: Director of Engineering or CTO
- **Secondary**: Two senior engineers (if primary unavailable)

Document approval in:

- Slack thread with `@devops-oncall @engineering-lead`
- Incident ticket
- Post-incident review

### Bypass Method 1: Disable Workflow Temporarily

**Use Case**: CI is completely broken, need to merge critical fix

**Procedure**:

```bash
# Step 1: Disable workflows (requires admin access)
gh api -X PUT /repos/OWNER/REPO/actions/workflows/validation-orchestrator.yml/disable

# Step 2: Merge critical PR
gh pr merge CRITICAL_PR_NUMBER --admin

# Step 3: Re-enable workflows immediately after
gh api -X PUT /repos/OWNER/REPO/actions/workflows/validation-orchestrator.yml/enable

# Step 4: Document in incident log
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Disabled validation-orchestrator.yml for critical hotfix PR#123" >> incidents/workflow-bypasses.log
```

### Bypass Method 2: Remove Branch Protection Temporarily

**Use Case**: Need to merge but status checks are stuck

**Procedure**:

```bash
# Step 1: Get current branch protection settings (backup)
gh api /repos/OWNER/REPO/branches/main/protection > /tmp/main-branch-protection-backup.json

# Step 2: Remove required checks temporarily
gh api -X DELETE /repos/OWNER/REPO/branches/main/protection/required_status_checks

# Step 3: Merge critical PR
gh pr merge CRITICAL_PR_NUMBER --admin

# Step 4: Restore branch protection immediately
gh api -X PUT /repos/OWNER/REPO/branches/main/protection \
  --input /tmp/main-branch-protection-backup.json

# Step 5: Verify restoration
gh api /repos/OWNER/REPO/branches/main/protection | jq .required_status_checks
```

### Bypass Method 3: Manual Review Override

**Use Case**: Validation has known false positive, need to merge specific PR

**Procedure**:

```bash
# Step 1: Add bypass label (requires write access)
gh pr edit PR_NUMBER --add-label "bypass-validation"

# Step 2: Get two senior engineer approvals
gh pr review PR_NUMBER --approve --body "Bypass approved: Known false positive in ESLint rule"

# Step 3: Admin merge (requires admin access)
gh pr merge PR_NUMBER --admin --squash

# Step 4: Remove bypass label and document
gh pr edit PR_NUMBER --remove-label "bypass-validation"
echo "$(date) - PR#${PR_NUMBER} merged with bypass - Reason: Known false positive" >> incidents/workflow-bypasses.log
```

### Post-Bypass Actions (MANDATORY)

Within 1 hour of bypass:

1. **Create Incident Ticket**:

   ```bash
   gh issue create \
     --title "POST-INCIDENT: Workflow bypass used for PR#123" \
     --label "incident,post-mortem-required" \
     --body "Bypass reason: CI outage\nApproved by: @director-of-engineering\nDuration: 15 minutes"
   ```

2. **Notify Team**:

   ```
   Post in #engineering:
   🚨 Emergency bypass used for PR#123
   Reason: GitHub Actions outage
   Approved by: @director-of-engineering
   Risk mitigation: Manual code review completed by 2 senior engineers
   Post-incident review: Scheduled for tomorrow 2pm
   ```

3. **Schedule Post-Mortem**:
   - Within 24 hours for critical bypasses
   - Within 48 hours for non-critical bypasses

4. **Update Runbook**:
   - Add new bypass scenario if novel
   - Update prevention measures

---

## Threshold Adjustment Procedures

### Coverage Threshold Adjustment

**Location**: `backend/pom.xml`

**Current Threshold**: 80% line coverage

**Procedure**:

```bash
# Step 1: Analyze current coverage
cd backend
mvn verify
open target/site/jacoco/index.html

# Step 2: Review coverage by package
# Identify areas with low coverage
# Determine if threshold change is justified

# Step 3: Update threshold in pom.xml
vim pom.xml
```

```xml
<!-- Find the JaCoCo plugin configuration -->
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <configuration>
    <rules>
      <rule>
        <element>BUNDLE</element>
        <limits>
          <limit>
            <counter>LINE</counter>
            <value>COVEREDRATIO</value>
            <minimum>0.75</minimum>  <!-- Changed from 0.80 -->
          </limit>
        </limits>
      </rule>
    </rules>
  </configuration>
</plugin>
```

```bash
# Step 4: Document change
cat >> docs/threshold-changes.md <<EOF
## $(date +%Y-%m-%d) - Coverage Threshold Change

**Previous**: 80%
**New**: 75%
**Reason**: Extensive DTO classes with minimal logic, coverage requirement unrealistic
**Approved By**: Engineering Lead
**Decision**: Temporary reduction, target to restore to 80% within 2 sprints
**Mitigation**: Focus coverage on business logic and services
EOF

# Step 5: Commit and PR
git add pom.xml docs/threshold-changes.md
git commit -m "chore(ci): adjust coverage threshold to 75%"
git push origin threshold/coverage-adjustment
gh pr create
```

**Guidelines for Threshold Changes**:

- **Increasing**: Requires team consensus, 2-sprint migration period
- **Decreasing**: Requires engineering lead approval, must document restoration plan
- **Temporary**: Max 3 months, must have concrete restoration plan

### Lint Warning Threshold Adjustment

**Location**: `frontend/.eslintrc.js` and `frontend-ci.yml`

**Current Threshold**: 0 warnings (fail on any warning)

**Procedure**:

```bash
# Step 1: Review current warnings
cd frontend
npm run lint

# Step 2: Decide on new threshold
# Option A: Allow warnings but still report
# Option B: Allow N warnings before failing

# Option A: Allow warnings (report only)
# In frontend-ci.yml:
```

```yaml
- name: Lint
  id: lint
  run: |
    cd frontend
    if npm run lint -- --max-warnings 999; then
      echo "status=success" >> $GITHUB_OUTPUT
    else
      echo "status=warning" >> $GITHUB_OUTPUT  # Changed from failure
    fi
  continue-on-error: true # Add this
```

```bash
# Option B: Allow N warnings
# In frontend/.eslintrc.js:
```

```javascript
module.exports = {
  // ... existing config ...
  rules: {
    // Downgrade specific rules to warnings
    '@typescript-eslint/no-unused-vars': 'warn', // Was 'error'
  },
};
```

```bash
# In frontend-ci.yml:
```

```yaml
- name: Lint
  run: npm run lint -- --max-warnings 10 # Allow up to 10 warnings
```

### Timeout Threshold Adjustment

**Location**: Workflow files (e.g., `frontend-ci.yml`)

**Current Timeouts**:

- Frontend CI: 15 minutes
- Backend CI: 20 minutes
- Security: 10 minutes

**Procedure**:

```yaml
# In frontend-ci.yml
jobs:
  frontend-validation:
    timeout-minutes: 20 # Increased from 15
```

**When to Adjust**:

- Legitimate builds consistently taking >80% of timeout
- New tests added significantly increasing duration
- Infrastructure slowdown observed

**When NOT to Adjust**:

- Occasional slow builds (investigate instead)
- Hanging/stuck builds (fix root cause)

---

## Monitoring and Alerting Setup

### GitHub Actions Metrics Dashboard

**Setup Grafana Dashboard** (if available):

```yaml
# dashboard.json (example)
{
  'dashboard':
    {
      'title': 'CI/CD Pipeline Metrics',
      'panels':
        [
          {
            'title': 'Workflow Success Rate',
            'targets':
              [
                {
                  'expr': "github_actions_workflow_runs{conclusion='success'} / github_actions_workflow_runs{}",
                },
              ],
          },
          {
            'title': 'Average Pipeline Duration',
            'targets':
              [
                {
                  'expr': "avg(github_actions_workflow_run_duration_seconds{workflow='Validation Orchestrator'})",
                },
              ],
          },
          {
            'title': 'Validation Failure Rate by Type',
            'targets':
              [
                {
                  'expr': "rate(github_actions_job_failures{job=~'frontend-ci|backend-ci|security-validation'}[1h])",
                },
              ],
          },
        ],
    },
}
```

### Manual Monitoring Commands

**Check Recent Workflow Runs**:

```bash
# Get last 24 hours of runs
gh api /repos/OWNER/REPO/actions/runs \
  --jq '.workflow_runs[] | select(.created_at > "'$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)'") | {name: .name, conclusion: .conclusion, duration: .run_duration_ms}'

# Count failures in last 24 hours
gh api /repos/OWNER/REPO/actions/runs \
  --jq '[.workflow_runs[] | select(.created_at > "'$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)'" and .conclusion == "failure")] | length'
```

**Check Average Duration**:

```bash
# Get average duration for last 10 runs
gh api /repos/OWNER/REPO/actions/runs \
  --jq '.workflow_runs[0:10] | map(.run_duration_ms) | add / length / 1000 / 60'
```

**Check Failure Patterns**:

```bash
# Group failures by job
gh api /repos/OWNER/REPO/actions/runs \
  --jq '.workflow_runs[] | select(.conclusion == "failure") | .name' \
  | sort | uniq -c | sort -rn
```

### Alerting Setup

**Slack Webhook Integration**:

```bash
# Add to repository secrets
gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

```yaml
# Add to validation-orchestrator.yml
jobs:
  alert-on-failure:
    needs: aggregate-results
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Send Slack Alert
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚨 CI Pipeline Failure Alert",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Workflow*: ${{ github.workflow }}\n*PR*: #${{ github.event.pull_request.number }}\n*Status*: FAILED\n*Link*: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

**PagerDuty Integration** (for critical alerts):

```yaml
- name: Trigger PagerDuty Alert
  if: failure() && github.ref == 'refs/heads/main' # Only for main branch failures
  uses: PagerDuty/pagerduty-change-events-action@v1
  with:
    integration-key: ${{ secrets.PAGERDUTY_INTEGRATION_KEY }}
    custom-event: |
      {
        "summary": "CI Pipeline Failure on main branch",
        "severity": "error",
        "source": "GitHub Actions",
        "component": "${{ github.workflow }}"
      }
```

### Health Check Script

Create `.github/scripts/health-check.sh`:

```bash
#!/bin/bash
set -e

echo "🔍 CI/CD Pipeline Health Check"
echo "================================"

# Check recent runs
TOTAL_RUNS=$(gh api /repos/OWNER/REPO/actions/runs --jq '.workflow_runs[0:20] | length')
FAILED_RUNS=$(gh api /repos/OWNER/REPO/actions/runs --jq '[.workflow_runs[0:20] | .[] | select(.conclusion == "failure")] | length')
SUCCESS_RATE=$(echo "scale=2; (($TOTAL_RUNS - $FAILED_RUNS) / $TOTAL_RUNS) * 100" | bc)

echo "📊 Success Rate (last 20 runs): ${SUCCESS_RATE}%"

if (( $(echo "$SUCCESS_RATE < 80" | bc -l) )); then
  echo "⚠️  WARNING: Success rate below 80%"
  echo "   Action required: Investigate recent failures"
fi

# Check average duration
AVG_DURATION=$(gh api /repos/OWNER/REPO/actions/runs --jq '[.workflow_runs[0:10] | .[] | .run_duration_ms] | add / length / 1000 / 60')
echo "⏱️  Average Duration (last 10 runs): ${AVG_DURATION} minutes"

if (( $(echo "$AVG_DURATION > 5" | bc -l) )); then
  echo "⚠️  WARNING: Average duration above 5 minutes"
  echo "   Action required: Consider optimization"
fi

echo ""
echo "✅ Health check complete"
```

**Run Health Check**:

```bash
# Run manually
bash .github/scripts/health-check.sh

# Or schedule in cron (external monitoring)
# Add to CI/CD monitoring dashboard
```

---

## Incident Response Procedures

### Incident Classification

#### P0 - Critical (Response: Immediate)

- Production deployment blocked
- > 50% of PRs failing
- Security vulnerability in pipeline
- Data breach or exposure

**Actions**:

1. Page on-call engineer immediately
2. Create incident channel: `#incident-YYYY-MM-DD-p0`
3. Notify engineering leadership
4. Begin incident response

#### P1 - High (Response: <15 minutes)

- 25-50% of PRs failing
- Pipeline duration >10 minutes
- Intermittent failures affecting multiple teams

**Actions**:

1. Notify on-call engineer
2. Create incident channel: `#incident-YYYY-MM-DD-p1`
3. Begin investigation

#### P2 - Medium (Response: <1 hour)

- <25% of PRs failing
- Known issue with workaround
- Performance degradation but within SLA

**Actions**:

1. Create incident ticket
2. Assign to on-call engineer
3. Investigate during business hours

#### P3 - Low (Response: <4 hours)

- Minor issues
- Documentation gaps
- Feature requests

**Actions**:

1. Create backlog ticket
2. Prioritize in next sprint planning

### Incident Response Steps

**Step 1: Acknowledge and Assess**

```bash
# Acknowledge incident in PagerDuty/Slack
# Post in #incident-YYYY-MM-DD:
"🚨 Incident acknowledged
Severity: P0
Description: Validation orchestrator failing for all PRs
IC: @your-name
Status: Investigating"

# Quick assessment
gh run list --limit 20
gh api /repos/OWNER/REPO/actions/runs --jq '[.workflow_runs[0:20] | .[] | select(.conclusion == "failure")] | length'
```

**Step 2: Investigate**

```bash
# Check recent changes
git log --oneline --since="24 hours ago" -- .github/workflows/

# Check GitHub Actions status
curl https://www.githubstatus.com/api/v2/status.json | jq .

# Check dependency status
curl https://status.npmjs.org/api/v2/status.json | jq .
curl https://status.maven.org/api/v2/status.json | jq .

# Check recent workflow runs
gh run list --limit 5
gh run view LATEST_RUN_ID --log
```

**Step 3: Mitigate**

```bash
# Option 1: Revert recent change
git revert BAD_COMMIT_SHA
git push origin main

# Option 2: Apply hotfix (see Emergency Bypass section)

# Option 3: Disable problematic workflow temporarily
gh api -X PUT /repos/OWNER/REPO/actions/workflows/WORKFLOW.yml/disable
```

**Step 4: Communicate**

```bash
# Update incident channel every 15 minutes
"Update: Root cause identified - dependency download timeout
Action: Reverting to cached dependencies
ETA: 5 minutes"

# Update status page if available
```

**Step 5: Resolve**

```bash
# Verify fix
gh run list --limit 5
# Confirm 5 consecutive successful runs

# Close incident
"✅ Incident resolved
Root cause: npm registry timeout
Fix: Reverted to cached dependencies
Prevention: Added dependency caching resilience
Duration: 23 minutes
Post-mortem: Scheduled for tomorrow 2pm"
```

**Step 6: Post-Incident Review**

Within 24-48 hours, create post-mortem document:

```markdown
# Post-Incident Review: YYYY-MM-DD - Pipeline Failure

## Summary

- Incident ID: INC-12345
- Severity: P0
- Duration: 23 minutes
- Impact: 15 PRs blocked

## Timeline

- 14:23 UTC: First failure detected
- 14:25 UTC: On-call paged
- 14:30 UTC: Root cause identified
- 14:35 UTC: Fix deployed
- 14:46 UTC: Verified resolved

## Root Cause

npm registry experienced partial outage, causing dependency downloads to timeout.

## Resolution

Reverted to cached dependencies and improved retry logic.

## Action Items

- [ ] Implement dependency caching fallback
- [ ] Add npm registry health check
- [ ] Update alerting threshold
- [ ] Document in runbook

## Lessons Learned

- Need better external dependency monitoring
- Caching strategy needs improvement
```

---

## Rollback Procedures

### Rollback Workflow Changes

**Scenario**: Recently merged workflow change is causing failures

**Procedure**:

```bash
# Step 1: Identify problematic commit
git log --oneline --since="24 hours ago" -- .github/workflows/
# Output: abc1234 feat(ci): add new validation step

# Step 2: Verify this is the problematic change
gh run list --commit abc1234

# Step 3: Create revert
git revert abc1234
git push origin main

# Step 4: Monitor revert
gh run watch

# Step 5: Verify success
gh run list --limit 5

# Step 6: Document
echo "$(date) - Reverted abc1234: new validation step causing 40% failure rate" >> rollbacks.log
```

### Rollback Script Changes

**Scenario**: Status reporter script has bug

**Procedure**:

```bash
# Step 1: Identify last known good version
git log --oneline -- .github/scripts/generate-status-comment.js

# Step 2: Checkout specific file from previous commit
git checkout abc1234~1 -- .github/scripts/generate-status-comment.js

# Step 3: Commit rollback
git add .github/scripts/generate-status-comment.js
git commit -m "revert(ci): rollback status comment script to known good version"
git push origin main

# Step 4: Verify
gh run list --limit 3
```

### Rollback Configuration Changes

**Scenario**: Threshold change too aggressive

**Procedure**:

```bash
# For coverage threshold in pom.xml
cd backend
git diff HEAD~1 pom.xml  # Review previous value

# Restore previous value
git checkout HEAD~1 -- pom.xml

# Commit and push
git add pom.xml
git commit -m "revert(ci): restore coverage threshold to 80%"
git push origin main
```

### Emergency Rollback (Nuclear Option)

**When**: Multiple changes deployed, unclear which is problematic

**Procedure**:

```bash
# Step 1: Identify last known good commit
git log --oneline --since="7 days ago"
# Find last commit before issues started

# Step 2: Create rollback branch
git checkout -b emergency-rollback/YYYY-MM-DD
git reset --hard KNOWN_GOOD_COMMIT

# Step 3: Force push (requires admin)
# ⚠️ WARNING: This is destructive!
git push origin emergency-rollback/YYYY-MM-DD

# Step 4: Update main (via PR or force push with approval)
gh pr create \
  --title "EMERGENCY ROLLBACK to $(git rev-parse --short KNOWN_GOOD_COMMIT)" \
  --body "Rolling back to last known good state due to cascading failures" \
  --label "emergency,rollback"

# Get approval and merge
gh pr merge --admin
```

**Post-Rollback**:

1. Document all rolled-back changes
2. Create issues for each rolled-back feature
3. Test fixes in isolation before redeploying
4. Update runbook with rollback reason

---

## Contact Information and Escalation Paths

### DevOps Team

#### Primary Contacts

**DevOps Lead**

- Name: [Your DevOps Lead]
- Slack: @devops-lead
- Email: devops-lead@company.com
- Phone: +1-555-DEVOPS (for emergencies only)
- Hours: Mon-Fri 9am-6pm EST
- On-call: No

**Senior DevOps Engineer**

- Name: [Senior Engineer 1]
- Slack: @devops-senior1
- Email: senior1@company.com
- Hours: Mon-Fri 9am-6pm EST
- On-call: Week 1, 3 (check PagerDuty)

**DevOps Engineer**

- Name: [Engineer 2]
- Slack: @devops-eng2
- Email: eng2@company.com
- Hours: Mon-Fri 9am-6pm EST
- On-call: Week 2, 4 (check PagerDuty)

### On-Call Rotation

**Schedule**: [PagerDuty Link]

**On-Call Responsibilities**:

- Respond to P0/P1 incidents within SLA
- Monitor #devops channel
- Weekly health check report
- Escalate if needed

**On-Call Escalation**:

1. **Primary**: Current on-call engineer (0-15 min response)
2. **Secondary**: Backup on-call engineer (15-30 min response)
3. **Tertiary**: DevOps Lead (30-60 min response)
4. **Executive**: Director of Engineering (60+ min response)

### External Contacts

#### GitHub Enterprise Support

- **Portal**: https://support.github.com/
- **Email**: enterprise-support@github.com
- **Phone**: [Available in support portal]
- **Hours**: 24/7 for P0/P1
- **SLA**: 4 hours for critical issues

**When to Contact**:

- GitHub Actions infrastructure outage
- Persistent workflow failures not related to our code
- Billing/quota issues
- Security incidents

#### Vendor Support

**npm Enterprise Support**

- Email: enterprise@npmjs.com
- Portal: https://npm.community/
- Use for: Registry outages, private package issues

**Maven Central Support**

- Email: support@sonatype.com
- Use for: Artifact resolution issues

**Slack Support** (for Slack integration issues)

- Portal: https://slack.com/help
- Use for: Webhook failures, rate limiting

### Escalation Decision Tree

```
Incident Detected
    ↓
Is production blocked?
    ├─ YES → P0 (Page on-call immediately)
    └─ NO → Continue
         ↓
    Are >25% PRs failing?
         ├─ YES → P1 (Notify on-call)
         └─ NO → Continue
              ↓
         Is there a workaround?
              ├─ YES → P2 (Create ticket)
              └─ NO → P1 (Notify on-call)
```

### Communication Channels

**Slack Channels**:

- `#devops` - General DevOps discussions
- `#devops-oncall` - On-call alerts and handoffs
- `#devops-alerts` - Automated alerts (PagerDuty, monitoring)
- `#incident-*` - Created per-incident for P0/P1

**Email Lists**:

- devops@company.com - DevOps team
- engineering-leads@company.com - Engineering leadership
- incidents@company.com - Incident notifications

**On-Call Phone Tree**:

1. PagerDuty → On-call primary
2. If no response in 5 min → Backup on-call
3. If no response in 10 min → DevOps Lead
4. If no response in 15 min → Director of Engineering

### Runbook Maintenance

**Owner**: DevOps Lead

**Review Frequency**: Quarterly (or after each major incident)

**Last Reviewed**: 2025-10-19

**Next Review**: 2026-01-19

**Update Process**:

1. Create PR with runbook changes
2. Review with DevOps team
3. Update "Last Reviewed" date
4. Notify team in #devops

**Feedback**:

Submit runbook improvements via:

- GitHub issues (label: `documentation`)
- Slack #devops channel
- Post-incident reviews

---

## Appendices

### Appendix A: Common Error Codes

| Error Code | Description                | Resolution                         |
| ---------- | -------------------------- | ---------------------------------- |
| ERR-001    | Artifact not found         | Check upload/download names match  |
| ERR-002    | Permission denied          | Add required permissions to job    |
| ERR-003    | Timeout exceeded           | Increase timeout or optimize build |
| ERR-004    | Dependency download failed | Check npm/Maven status, retry      |
| ERR-005    | Out of disk space          | Clean up runner, optimize builds   |
| ERR-006    | Network timeout            | Retry, check external service      |
| ERR-007    | Authentication failed      | Verify GITHUB_TOKEN permissions    |
| ERR-008    | Workflow syntax error      | Validate YAML syntax               |
| ERR-009    | Secret not found           | Verify secret exists in repository |
| ERR-010    | Rate limit exceeded        | Wait for reset, optimize API calls |

### Appendix B: Useful Commands Reference

```bash
# View workflow runs
gh run list --limit 20
gh run view RUN_ID --log

# Cancel workflow
gh run cancel RUN_ID

# Re-run workflow
gh run rerun RUN_ID

# List workflows
gh workflow list

# Disable/Enable workflow
gh api -X PUT /repos/OWNER/REPO/actions/workflows/WORKFLOW.yml/disable
gh api -X PUT /repos/OWNER/REPO/actions/workflows/WORKFLOW.yml/enable

# View secrets
gh secret list

# Set secret
gh secret set SECRET_NAME

# View branch protection
gh api /repos/OWNER/REPO/branches/main/protection

# Trigger workflow manually
gh workflow run WORKFLOW.yml

# Download artifacts
gh run download RUN_ID

# View PR checks
gh pr checks PR_NUMBER
```

### Appendix C: Changelog

| Date       | Change                                    | Author      |
| ---------- | ----------------------------------------- | ----------- |
| 2025-10-19 | Initial runbook creation                  | DevOps Team |
| YYYY-MM-DD | Added emergency bypass procedure examples | [Your Name] |
| YYYY-MM-DD | Updated escalation contacts               | [Your Name] |

---

**Document Version**: 1.0
**Last Updated**: 2025-10-19
**Next Review**: 2026-01-19
**Owner**: DevOps Team
**Status**: Active
