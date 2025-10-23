# Alert Testing Framework

## Overview

Automated testing framework for validating Prometheus alert rules and AlertManager configuration. Ensures alerts fire correctly, route to appropriate channels, and include proper metadata.

## Features

- ✅ **Automated Alert Testing** - Inject test conditions and verify alerts fire
- ✅ **Alert Metadata Validation** - Check labels, annotations, severity
- ✅ **Routing Verification** - Validate alerts route to correct receivers
- ✅ **Timing Validation** - Ensure alerts fire within SLA (<2 min)
- ✅ **Deduplication Testing** - Verify alert grouping works correctly
- ✅ **Silence Testing** - Validate alert silencing functionality
- ✅ **Python & Bash Tools** - Multiple interfaces for different use cases

## Quick Start

### Prerequisites

```bash
# Install Python dependencies
pip install -r requirements.txt

# Or install individually
pip install requests PyYAML python-dateutil

# Verify tools are available
which jq curl
```

### Run Basic Tests

```bash
# Run all automated tests
./alert-test-framework.sh

# Test specific alert rule configuration
./alert-test-framework.sh --alert PrometheusUnavailable

# Inject test conditions and verify alert fires
python3 alert_injector.py inject-error-rate --duration 6
python3 alert_injector.py wait-for-alert HighErrorRate --timeout 360
```

## Components

### 1. Bash Test Framework (`alert-test-framework.sh`)

**Purpose:** Validate alert rule configuration and AlertManager setup

**Tests:**
- All alert rules loaded in Prometheus
- Alert rule syntax and expressions valid
- Alert metadata (labels, annotations) present
- AlertManager routing configured
- Alert deduplication settings
- Alert inhibition rules
- Silence functionality

**Usage:**
```bash
# Run all tests
./alert-test-framework.sh

# Custom endpoints
export PROMETHEUS_URL=http://prometheus.example.com:9090
export ALERTMANAGER_URL=http://alertmanager.example.com:9093
./alert-test-framework.sh
```

**Output:**
```
=========================================
Alert Testing Framework
=========================================
Prometheus: http://prometheus:9090
AlertManager: http://alertmanager:9093
=========================================

Test 1: All Alert Rules Loaded
✓ Found: ServiceDown
✓ Found: HighProbeFailureRate
✓ Found: PrometheusUnavailable
[PASS] All expected alert rules found

Test 2: Alert Routing Configuration
✓ AlertManager routing configured
✓ AlertManager receivers configured
[PASS] Alert routing configuration verified

=========================================
Test Summary
=========================================
Total Tests: 8
Passed: 7
Failed: 0
Skipped: 1
=========================================
```

### 2. Python Alert Injector (`alert_injector.py`)

**Purpose:** Inject test conditions to trigger specific alerts

**Commands:**

**Inject High Error Rate:**
```bash
python3 alert_injector.py inject-error-rate \
  --service test-service \
  --duration 5
```

**Inject High Latency:**
```bash
python3 alert_injector.py inject-latency \
  --service test-service \
  --latency 2000 \
  --duration 5
```

**Inject Resource Exhaustion:**
```bash
# Memory exhaustion
python3 alert_injector.py inject-resource-exhaustion \
  --service test-service \
  --resource memory \
  --usage 95 \
  --duration 5

# CPU exhaustion
python3 alert_injector.py inject-resource-exhaustion \
  --service test-service \
  --resource cpu \
  --usage 90 \
  --duration 5
```

**Wait for Alert:**
```bash
python3 alert_injector.py wait-for-alert HighErrorRate --timeout 180
```

**Clear Test Metrics:**
```bash
python3 alert_injector.py clear --service test-service
```

### 3. Test Scenarios (`test-scenarios.yaml`)

**Purpose:** Defines comprehensive test scenarios for all alert types

**Scenarios:**
1. Service Down Detection
2. High Error Rate Detection
3. High Latency Detection
4. Resource Exhaustion (Memory/CPU)
5. Prometheus Unavailable
6. Alert Routing by Severity
7. Alert Deduplication
8. Alert Inhibition
9. Alert Silencing
10. Alert Recovery Notification

**Example Scenario:**
```yaml
- name: "High Error Rate Detection"
  alert: "HighErrorRate"
  severity: high
  duration: "5m"
  test_steps:
    - action: "Inject metrics showing 15% error rate"
      command: "./alert_injector.py inject-error-rate --duration 6"
    - action: "Wait for alert to fire"
      command: "./alert_injector.py wait-for-alert HighErrorRate --timeout 360"
  validation:
    - check: "Alert fires within 5 minutes"
    - check: "Alert includes service label"
  automated_test: true
```

## Test Execution

### Automated Test Suite

```bash
# 1. Run configuration tests
./alert-test-framework.sh

# 2. Run alert injection tests
for scenario in error-rate latency resource-exhaustion; do
  echo "Testing $scenario..."
  python3 alert_injector.py inject-$scenario --duration 6 &
  python3 alert_injector.py wait-for-alert ${scenario}-alert --timeout 360
  python3 alert_injector.py clear
done
```

### Manual Test Procedures

Some tests require manual intervention:

**Service Down Test:**
```bash
# 1. Stop target service
kubectl scale deployment/test-service --replicas=0 -n test

# 2. Wait for alert (should fire within 2 min)
python3 alert_injector.py wait-for-alert ServiceDown --timeout 180

# 3. Restart service
kubectl scale deployment/test-service --replicas=1 -n test

# 4. Verify alert clears (should clear within 1 min)
```

**Alert Routing Test:**
```bash
# 1. Trigger critical alert
# (manually stop critical service)

# 2. Check notification channels
# - Verify page sent to on-call
# - Check Slack #critical-alerts
# - Verify email sent

# 3. Trigger high severity alert
# (inject high error rate)

# 4. Check notification channels
# - Verify Slack #alerts
# - Verify email sent
# - Verify NO page sent
```

## Integration with CI/CD

### GitHub Actions

```yaml
name: Alert Testing
on:
  schedule:
    - cron: '0 3 * * *'  # Daily at 3 AM
  workflow_dispatch:

jobs:
  test-alerts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install Dependencies
        run: |
          pip install -r infrastructure/kubernetes/observability-alert-tests/requirements.txt

      - name: Run Alert Tests
        run: |
          cd infrastructure/kubernetes/observability-alert-tests
          ./alert-test-framework.sh

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: alert-test-results
          path: infrastructure/kubernetes/observability-alert-tests/test-results/
```

### Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: alert-testing
  namespace: observability
spec:
  schedule: "0 3 * * *"  # Daily at 3 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: alert-tester
            image: python:3.11
            command:
              - /bin/bash
              - -c
              - |
                pip install requests PyYAML
                cd /tests
                ./alert-test-framework.sh
            volumeMounts:
            - name: test-scripts
              mountPath: /tests
          volumes:
          - name: test-scripts
            configMap:
              name: alert-test-scripts
          restartPolicy: OnFailure
```

## Expected Results

### Pass Criteria

✅ All alert rules loaded in Prometheus
✅ Alert metadata complete (labels, annotations)
✅ Alerts fire within SLA (<2 min for critical, <5 min for others)
✅ Alert routing configured correctly
✅ Deduplication prevents duplicate notifications
✅ Silences work as expected
✅ Recovery notifications sent

### Common Issues and Solutions

**Issue:** Alert doesn't fire
- **Check:** Alert rule syntax in Prometheus
- **Check:** Alert expression evaluates to true
- **Check:** `for` duration not yet met
- **Solution:** Verify query returns data, check evaluation interval

**Issue:** Alert fires too slowly
- **Check:** Prometheus scrape interval
- **Check:** Alert `for` duration
- **Check:** Evaluation interval
- **Solution:** Reduce scrape interval or `for` duration

**Issue:** Wrong notification channel
- **Check:** AlertManager routing rules
- **Check:** Alert labels match route matchers
- **Solution:** Update routing configuration

**Issue:** Duplicate notifications
- **Check:** AlertManager grouping settings
- **Check:** `group_wait` and `group_interval` values
- **Solution:** Adjust grouping configuration

## Best Practices

1. **Test Regularly** - Run alert tests weekly minimum
2. **Test in Non-Production** - Use staging environment first
3. **Document Manual Tests** - Keep test logs for compliance
4. **Version Control** - Track changes to alert rules and tests
5. **Clean Up** - Clear test metrics after injection
6. **Monitor Impact** - Watch for side effects during testing
7. **Validate Metadata** - Ensure labels/annotations present
8. **Test Recovery** - Verify alerts clear correctly
9. **Test Routing** - Validate notifications reach correct channels
10. **Update Tests** - Add tests when adding new alerts

## Troubleshooting

### Python Script Errors

**Error:** `ModuleNotFoundError: No module named 'requests'`
**Solution:**
```bash
pip install -r requirements.txt
```

**Error:** `Connection refused`
**Solution:**
```bash
# Check services are accessible
kubectl port-forward -n observability svc/prometheus 9090:9090
kubectl port-forward -n observability svc/alertmanager 9093:9093
```

### Bash Script Errors

**Error:** `jq: command not found`
**Solution:**
```bash
# macOS
brew install jq

# Linux
apt-get install jq
```

**Error:** `Alert did not fire within timeout`
**Investigation:**
```bash
# Check if alert rule exists
curl -s prometheus:9090/api/v1/rules | jq '.data.groups[].rules[] | select(.name == "AlertName")'

# Check if alert condition is true
curl -s 'prometheus:9090/api/v1/query?query=alert_expression' | jq

# Check evaluation interval
curl -s prometheus:9090/api/v1/status/config | jq '.data.yaml' | grep evaluation_interval
```

### Metric Injection Issues

**Issue:** Metrics not appearing in Prometheus
**Check:**
- Pushgateway is accessible
- Metrics format is correct
- Prometheus scrapes pushgateway

**Solution:**
```bash
# Verify pushgateway
curl pushgateway:9091/metrics

# Check Prometheus targets
curl prometheus:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job == "pushgateway")'
```

## References

- [Prometheus Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [AlertManager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [Alert Testing Best Practices](https://sre.google/workbook/alerting-on-slos/)

---

**Last Updated:** 2025-10-22
**Maintainer:** DevOps Team
**Status:** Production Ready
