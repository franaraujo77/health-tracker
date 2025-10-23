# Grafana Dashboard User Guides

## Quick Reference Card

| Dashboard | Primary Users | Update Frequency | Key Metrics |
|-----------|---------------|------------------|-------------|
| **Executive** | Leadership, Product | 5 minutes | Health score, success rate, costs |
| **Operations** | DevOps, SRE | Real-time | Active workflows, error rates, resources |
| **Development** | Engineers | 30 seconds | Build times, test results, traces |
| **Cost** | Finance, DevOps | 1 hour | Daily costs, API usage, anomalies |

**Access**: `https://grafana.company.com/dashboards`

---

## 1. Executive Dashboard

**Purpose**: High-level pipeline health and business metrics for leadership

**URL**: `/d/executive-overview`

**Refresh**: Auto-refresh every 5 minutes

### Key Panels

#### Pipeline Health Score (0-100)
**What it shows**: Composite health metric based on success rate, error count, and SLA compliance

**How to read**:
- 🟢 **90-100**: Healthy - All systems operating normally
- 🟡 **70-89**: Warning - Some issues detected, monitor closely
- 🔴 **<70**: Critical - Immediate attention required

**Common actions**:
- Click score to drill down to Operations Dashboard
- Check "Top Issues" panel for root causes

#### Success Rate Trend (Last 7 Days)
**Query**:
```promql
sum(rate(pipeline_runs_total{status="success"}[5m])) /
sum(rate(pipeline_runs_total[5m])) * 100
```

**What it shows**: Percentage of successful pipeline runs over time

**Target**: >95% success rate

**Interpretation**:
- Downward trend → Investigate in Operations Dashboard
- Spikes down → Check alerts for specific failures
- Flat low line → Systemic issue, page on-call

#### Cost vs Budget
**What it shows**: Monthly spending vs allocated budget

**Data sources**:
- Claude API costs
- AWS infrastructure costs
- GitHub Actions minutes

**Actions**:
- Click to drill down to Cost Dashboard
- Export data: Click "..." → "Export CSV"

#### Active Alerts (Table)
**Columns**:
- Severity (Critical/High/Medium)
- Alert Name
- Workflow Affected
- Duration
- Actions (Silence/Acknowledge)

**Color coding**:
- Red = Critical
- Orange = High
- Yellow = Medium

---

## 2. Operations Dashboard

**Purpose**: Real-time pipeline monitoring for DevOps and SRE teams

**URL**: `/d/operations-overview`

**Refresh**: Auto-refresh every 30 seconds

### Key Panels

#### Real-Time Pipeline Status
**What it shows**: Current state of all active workflows

**States**:
- 🔵 Running
- 🟢 Succeeded
- 🔴 Failed
- ⚫ Queued

**Usage**:
```
Click any workflow → Opens trace viewer
Hover → Shows workflow details
Right-click → "View in GitHub"
```

#### Workflow Duration Heatmap
**What it shows**: Build time patterns across workflows and time of day

**Query**:
```promql
histogram_quantile(0.95,
  sum(rate(workflow_duration_seconds_bucket[5m])) by (le, workflow)
)
```

**How to read**:
- Dark red = Slow (>10 min)
- Yellow = Normal (5-10 min)
- Green = Fast (<5 min)

**Common patterns**:
- Horizontal bands = Consistently slow workflow
- Vertical bands = Infrastructure issues at specific times
- Scattered red = Flaky tests or resource contention

**Actions**:
1. Click cell → Filter to specific workflow + time
2. Check "Error Rate" panel for correlation
3. View traces in Development Dashboard

#### Error Rate by Stage
**What it shows**: Where failures occur in the pipeline

**Stages**:
- Checkout
- Build
- Test
- Package
- Deploy

**Query**:
```promql
sum(rate(workflow_errors_total[5m])) by (stage)
```

**Troubleshooting**:
- **High checkout errors** → GitHub API issues
- **High build errors** → Dependency problems
- **High test errors** → Code quality or flaky tests
- **High package errors** → Docker registry issues
- **High deploy errors** → Infrastructure or credentials

#### Resource Utilization
**Panels**:
- CPU Usage (% of limit)
- Memory Usage (% of limit)
- Disk I/O (MB/s)
- Network I/O (MB/s)

**Query example (CPU)**:
```promql
sum(rate(container_cpu_usage_seconds_total{namespace="ci-cd"}[5m])) by (pod) /
sum(container_spec_cpu_quota{namespace="ci-cd"}) by (pod) * 100
```

**Actions**:
- CPU >80% sustained → Consider HPA scale-up
- Memory >85% → Check for memory leaks
- Disk I/O spikes → Investigate log volume
- Network spikes → Check artifact uploads

#### Logs Panel (Bottom)
**Live log streaming**: Last 100 lines

**LogQL query**:
```logql
{namespace="ci-cd"} |= "error" | json | level="error"
```

**Tips**:
- Use filters: `|= "keyword"` (contains), `!= "keyword"` (excludes)
- Extract fields: `| json | field_name="value"`
- Time range: Click timestamp column to zoom

---

## 3. Development Dashboard

**Purpose**: Detailed workflow analysis for engineers debugging issues

**URL**: `/d/development-overview`

**Refresh**: Auto-refresh every 30 seconds

### Key Panels

#### Build Duration by Workflow
**What it shows**: Average build time for each workflow over selected time range

**Query**:
```promql
avg(rate(workflow_duration_seconds_sum[5m])) by (workflow) /
avg(rate(workflow_duration_seconds_count[5m])) by (workflow)
```

**Usage**:
- Click bar → Drill down to specific workflow runs
- Compare against baseline (gray line)
- Export data for trend analysis

**Optimization hints**:
- >10 min → Consider caching
- Increasing trend → Dependency bloat
- High variance → Flaky tests or resource contention

#### Test Execution Time
**Panel A: Total Test Time**
```promql
sum(test_duration_seconds) by (suite)
```

**Panel B: Slowest Tests (Table)**
Columns: Test Name, Duration, Success Rate, Last Run

**Panel C: Flaky Test Detection**
Tests with <80% success rate in last 24h

**Actions**:
1. Click flaky test → View historical runs
2. Check traces for failed runs
3. See error logs inline

**Quick fixes**:
- Retry flaky tests: Add `@retry(3)` annotation
- Skip problematic test: Add to skip list
- Report bug: Click "Create JIRA" button

#### Trace Viewer
**What it shows**: Distributed trace visualization for a single workflow run

**How to access**:
1. Enter trace ID (from logs or URL parameter)
2. Or click "View Trace" from any workflow panel

**Trace anatomy**:
```
└─ Workflow: frontend-ci [total: 450s]
   ├─ Checkout [5s]
   ├─ Setup Node [15s]
   ├─ Install Dependencies [120s] ← Slowest span
   ├─ Lint [30s]
   ├─ Test [200s]
   │  ├─ Unit Tests [100s]
   │  └─ Integration Tests [100s]
   └─ Build [80s]
```

**Features**:
- Click span → See attributes (env vars, exit codes)
- Red spans → Errors with stack traces
- Blue links → Jump to related logs
- Green links → Jump to correlated metrics

**Performance analysis**:
- Span duration = Time spent in that stage
- Gaps between spans = Queuing/waiting time
- Nested spans = Sub-operations within a stage

---

## 4. Cost Dashboard

**Purpose**: Financial tracking and cost optimization

**URL**: `/d/cost-overview`

**Refresh**: Auto-refresh every hour

### Key Panels

#### Daily Cost Trend
**What it shows**: Total daily spending across all services

**Query**:
```promql
sum(
  increase(claude_api_cost_dollars[1d]) +
  increase(aws_infrastructure_cost_dollars[1d]) +
  increase(github_actions_cost_dollars[1d])
)
```

**Metrics**:
- Current day (partial)
- 7-day average
- 30-day average
- Monthly projection

**Budget indicators**:
- Green line = Budget threshold
- Yellow zone = 80-100% of budget
- Red zone = Over budget

#### Cost Breakdown (Pie Chart)
**Categories**:
- Claude API calls
- AWS compute (EC2, Lambda)
- AWS storage (S3, EBS)
- GitHub Actions minutes
- Other services

**Actions**:
- Click slice → See detailed breakdown
- Hover → Exact cost and percentage

#### Claude API Token Usage
**Panel A: Tokens per Day**
```promql
sum(increase(claude_api_tokens_total[1d])) by (model)
```

**Panel B: Cost per Request**
```promql
sum(claude_api_cost_dollars) / sum(claude_api_requests_total)
```

**Panel C: Top Consumers (Table)**
Shows which workflows use the most API tokens

**Optimization tips**:
- High tokens → Review prompt length
- High requests → Check for loops/retries
- Expensive model → Consider cheaper alternatives for simple tasks

#### Cost Anomalies (Table)
**What it shows**: Unexpected cost spikes detected by ML algorithm

**Columns**:
- Date/Time
- Service
- Expected Cost
- Actual Cost
- Delta (%)
- Status (Investigating/Resolved)

**Anomaly detection**:
- >150% of baseline → Flagged as anomaly
- Baseline = 7-day rolling average

**Investigation workflow**:
1. Click anomaly → Opens filtered view
2. Check "Related Workflows" panel
3. Review logs for that time period
4. Create incident ticket if needed

---

## Common Tasks

### Task 1: Investigate Pipeline Failure

**Steps**:
1. Go to **Operations Dashboard**
2. Check **Error Rate by Stage** → Identify which stage failed
3. Click failed stage → Drill down to workflow
4. Go to **Development Dashboard**
5. Enter workflow run ID in **Trace Viewer**
6. Expand failed span → See error details
7. Click "View Logs" → See full error context
8. If unclear → Check **Runbooks** (see runbooks.md)

### Task 2: Monitor Cost Spike

**Steps**:
1. Go to **Cost Dashboard**
2. Check **Cost Anomalies** table
3. Click anomaly → See time range and service
4. Review **Claude API Token Usage** or **AWS Costs**
5. Check **Top Consumers** → Identify responsible workflow
6. Go to **Development Dashboard** → Analyze workflow
7. Optimize workflow or set alerts

### Task 3: Review Weekly Pipeline Health

**Steps**:
1. Go to **Executive Dashboard**
2. Note **Pipeline Health Score** trend
3. Check **Success Rate Trend** → Any dips?
4. Review **Active Alerts** → Any recurring issues?
5. Go to **Cost Dashboard** → Compare actual vs budget
6. Export report: Click "Share" → "Export PDF"
7. Share in weekly standup

### Task 4: Create Custom View

**Steps**:
1. Navigate to any dashboard
2. Click "Dashboard settings" (gear icon)
3. Click "Save As"
4. Enter new name: "My Custom View"
5. Add/remove panels as needed
6. Set custom time range and refresh
7. Save and share URL with team

---

## Time Range Selector

All dashboards support dynamic time ranges:

**Quick ranges**:
- Last 5 minutes
- Last 15 minutes
- Last 1 hour
- Last 6 hours
- Last 24 hours
- Last 7 days
- Last 30 days
- Last 90 days

**Custom range**:
1. Click time range dropdown
2. Select "Custom"
3. Enter start and end dates
4. Apply

**Auto-refresh**:
- 5s, 10s, 30s, 1m, 5m, 15m, 30m, 1h, 2h
- Or "Off" for static view

---

## Variables and Filters

### Dashboard Variables

Most dashboards include variables for filtering:

**Workflow Variable**:
- Dropdown at top: "Select workflow"
- Options: All, frontend-ci, backend-ci, etc.
- Multi-select: Ctrl+Click (Windows) or Cmd+Click (Mac)

**Environment Variable**:
- Options: All, production, staging, development
- Affects all panels simultaneously

**Example usage**:
```
Workflow: backend-ci
Environment: production
Time: Last 7 days
```
→ Shows only backend-ci production runs from last week

### Panel-Level Filters

Some panels have additional filters:

**Logs Panel**:
- Severity: ERROR, WARN, INFO, DEBUG
- Contains text: Enter keyword
- Exclude text: Enter keyword to exclude

**Trace Viewer**:
- Min duration: Only show spans >Xs
- Has error: Only show failed spans
- Service: Filter by service name

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `d` + `s` | Save dashboard |
| `d` + `k` | Toggle kiosk mode (fullscreen) |
| `t` + `z` | Zoom out time range |
| `t` + `←` | Move time range backward |
| `t` + `→` | Move time range forward |
| `Esc` | Exit fullscreen panel |
| `/` | Focus search bar |
| `?` | Show all shortcuts |

---

## Mobile Access

All dashboards are mobile-responsive:

**Optimizations**:
- Vertical panel layout
- Touch-friendly controls
- Simplified visualizations
- Reduced auto-refresh (to save battery)

**Mobile URL**: `https://grafana.company.com/mobile/dashboards`

**Recommended**: Install Grafana mobile app (iOS/Android)

---

## Troubleshooting

### Dashboard Not Loading

**Symptoms**: Blank panels, "No data" errors

**Fixes**:
1. Check datasource health: Settings → Data Sources → Test
2. Verify time range includes data (expand range)
3. Check query syntax: Panel → Edit → Query tab
4. Clear browser cache: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### Slow Dashboard Performance

**Symptoms**: Panels loading slowly, browser lag

**Fixes**:
1. Reduce time range (use last 24h instead of 30d)
2. Disable auto-refresh temporarily
3. Close unused dashboard tabs
4. Simplify complex queries (ask DevOps for help)

### Data Seems Wrong

**Symptoms**: Metrics don't match reality

**Fixes**:
1. Check selected time range (clock icon)
2. Verify variables (workflow, environment filters)
3. Compare with Prometheus directly: Settings → Explore
4. Check for recent deployments (may have reset counters)

---

## Best Practices

### For Daily Monitoring
1. Start with **Operations Dashboard** each morning
2. Check for red/yellow indicators
3. Review overnight alerts
4. Set time range to "Last 24 hours"
5. Investigate any anomalies before standup

### For Incident Response
1. **Operations Dashboard** → Identify scope
2. **Development Dashboard** → Deep dive into traces
3. Keep dashboard open during incident
4. Use "Share snapshot" to capture state
5. Annotate timeline after resolution

### For Reporting
1. **Executive Dashboard** → Weekly health report
2. **Cost Dashboard** → Monthly financial review
3. Export as PDF: "Share" → "Export PDF"
4. Add annotations: Right-click timeline → "Add annotation"
5. Schedule automated reports: Settings → Report

---

## Getting Help

- **Documentation**: This guide + architecture.md
- **Runbooks**: See runbooks.md for specific issues
- **Training**: See training-materials.md
- **Support**: #observability-help Slack channel
- **Office Hours**: Tuesdays 2-3pm with DevOps team

---

**Last Updated**: 2025-10-22
**Version**: 1.0
**Feedback**: observability@company.com
