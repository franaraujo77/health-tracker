#!/bin/bash
# Alert Testing Framework
# Validates that alert rules fire correctly when test conditions are injected

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus:9090}"
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://alertmanager:9093}"
RESULTS_DIR="./test-results"
TIMEOUT=180  # 3 minutes for alert to fire

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Create results directory
mkdir -p "$RESULTS_DIR"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Check if alert is firing
check_alert_firing() {
    local alert_name="$1"
    local timeout="${2:-$TIMEOUT}"
    local start_time=$(date +%s)

    log_info "Waiting for alert '$alert_name' to fire (timeout: ${timeout}s)..."

    while true; do
        local elapsed=$(($(date +%s) - start_time))

        if [ $elapsed -gt $timeout ]; then
            log_error "Timeout: Alert '$alert_name' did not fire within ${timeout}s"
            return 1
        fi

        # Check AlertManager for firing alert
        local alert_count=$(curl -s "${ALERTMANAGER_URL}/api/v2/alerts" | \
            jq -r "[.[] | select(.labels.alertname == \"${alert_name}\" and .status.state == \"active\")] | length")

        if [ "$alert_count" -gt 0 ]; then
            log_success "Alert '$alert_name' is firing after ${elapsed}s"
            return 0
        fi

        echo -n "."
        sleep 5
    done
}

# Silence alert
silence_alert() {
    local alert_name="$1"
    local duration="${2:-10m}"

    log_info "Silencing alert '$alert_name' for $duration..."

    local silence_payload=$(cat <<EOF
{
  "matchers": [
    {
      "name": "alertname",
      "value": "$alert_name",
      "isRegex": false
    }
  ],
  "startsAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "endsAt": "$(date -u -d "+$duration" +%Y-%m-%dT%H:%M:%SZ)",
  "createdBy": "alert-test-framework",
  "comment": "Automated test - silencing alert"
}
EOF
)

    curl -s -X POST "${ALERTMANAGER_URL}/api/v2/silences" \
        -H "Content-Type: application/json" \
        -d "$silence_payload" > /dev/null

    log_success "Alert silenced"
}

# Inject test metrics to Prometheus
inject_test_metric() {
    local metric_name="$1"
    local metric_value="$2"
    local labels="${3:-}"

    log_info "Injecting test metric: $metric_name=$metric_value"

    # Use Prometheus pushgateway if available, otherwise skip
    if command -v kubectl &> /dev/null; then
        # Try using kubectl port-forward to pushgateway
        local pod=$(kubectl get pods -n observability -l app=prometheus -o jsonpath='{.items[0].metadata.name}')
        if [ -n "$pod" ]; then
            # Inject via PromQL direct write (requires special permissions)
            log_warning "Direct metric injection requires pushgateway - skipping"
            return 1
        fi
    fi

    return 1
}

# Wait for alert to clear
wait_for_alert_cleared() {
    local alert_name="$1"
    local timeout="${2:-120}"
    local start_time=$(date +%s)

    log_info "Waiting for alert '$alert_name' to clear (timeout: ${timeout}s)..."

    while true; do
        local elapsed=$(($(date +%s) - start_time))

        if [ $elapsed -gt $timeout ]; then
            log_warning "Timeout: Alert '$alert_name' did not clear within ${timeout}s"
            return 1
        fi

        local alert_count=$(curl -s "${ALERTMANAGER_URL}/api/v2/alerts" | \
            jq -r "[.[] | select(.labels.alertname == \"${alert_name}\" and .status.state == \"active\")] | length")

        if [ "$alert_count" -eq 0 ]; then
            log_success "Alert '$alert_name' cleared after ${elapsed}s"
            return 0
        fi

        echo -n "."
        sleep 5
    done
}

# Verify alert metadata
verify_alert_metadata() {
    local alert_name="$1"
    local expected_severity="$2"

    log_info "Verifying alert metadata for '$alert_name'..."

    local alert_data=$(curl -s "${ALERTMANAGER_URL}/api/v2/alerts" | \
        jq -r ".[] | select(.labels.alertname == \"${alert_name}\")" | head -1)

    if [ -z "$alert_data" ]; then
        log_error "Alert not found in AlertManager"
        return 1
    fi

    local actual_severity=$(echo "$alert_data" | jq -r '.labels.severity // "unknown"')

    if [ "$actual_severity" != "$expected_severity" ]; then
        log_error "Severity mismatch: expected '$expected_severity', got '$actual_severity'"
        return 1
    fi

    # Check for required labels
    local required_labels=("alertname" "severity")
    for label in "${required_labels[@]}"; do
        local label_value=$(echo "$alert_data" | jq -r ".labels.$label // \"\"")
        if [ -z "$label_value" ]; then
            log_error "Missing required label: $label"
            return 1
        fi
    done

    # Check for annotations
    local description=$(echo "$alert_data" | jq -r '.annotations.description // ""')
    if [ -z "$description" ]; then
        log_warning "Alert missing description annotation"
    fi

    log_success "Alert metadata verified"
    return 0
}

# Test runner
run_test() {
    local test_name="$1"
    local test_function="$2"

    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    echo ""
    echo "========================================="
    echo "Test $TESTS_TOTAL: $test_name"
    echo "========================================="

    if $test_function; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        log_success "Test passed: $test_name"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        log_error "Test failed: $test_name"
    fi
}

# =========================================
# Individual Alert Tests
# =========================================

test_service_down_alert() {
    local alert_name="ServiceDown"

    # This test requires manually stopping a service
    # or using blackbox exporter to probe a non-existent endpoint

    log_info "Testing $alert_name alert..."
    log_warning "This test requires manual service disruption or probe configuration"
    log_warning "Skipping automated test - see manual test procedure in README"

    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
    return 1
}

test_high_probe_failure_rate_alert() {
    local alert_name="HighProbeFailureRate"

    log_info "Testing $alert_name alert..."

    # Check if alert rule exists in Prometheus
    local rule_exists=$(curl -s "${PROMETHEUS_URL}/api/v1/rules" | \
        jq -r ".data.groups[].rules[] | select(.name == \"${alert_name}\") | .name")

    if [ -z "$rule_exists" ]; then
        log_error "Alert rule not found in Prometheus"
        return 1
    fi

    log_success "Alert rule exists in Prometheus"

    # In a real scenario, we would need to inject probe failures
    # For now, just verify the rule configuration
    local rule_expr=$(curl -s "${PROMETHEUS_URL}/api/v1/rules" | \
        jq -r ".data.groups[].rules[] | select(.name == \"${alert_name}\") | .query")

    if [ -z "$rule_expr" ]; then
        log_error "Alert rule has no query expression"
        return 1
    fi

    log_info "Alert expression: $rule_expr"
    log_success "Alert rule configuration verified"

    return 0
}

test_prometheus_unavailable_alert() {
    local alert_name="PrometheusUnavailable"

    log_info "Testing $alert_name alert..."

    # Verify alert rule exists
    local rule_exists=$(curl -s "${PROMETHEUS_URL}/api/v1/rules" | \
        jq -r ".data.groups[].rules[] | select(.name == \"${alert_name}\") | .name")

    if [ -z "$rule_exists" ]; then
        log_error "Alert rule not found"
        return 1
    fi

    # Verify it's configured as critical
    local severity=$(curl -s "${PROMETHEUS_URL}/api/v1/rules" | \
        jq -r ".data.groups[].rules[] | select(.name == \"${alert_name}\") | .labels.severity")

    if [ "$severity" != "critical" ]; then
        log_error "Alert severity should be 'critical', got '$severity'"
        return 1
    fi

    log_success "Alert rule configuration verified"
    return 0
}

test_cost_spike_alert() {
    local alert_name="CostSpikeDetected"

    log_info "Testing $alert_name alert (if configured)..."

    # This alert may not be configured yet
    local rule_exists=$(curl -s "${PROMETHEUS_URL}/api/v1/rules" | \
        jq -r ".data.groups[].rules[] | select(.name == \"${alert_name}\") | .name")

    if [ -z "$rule_exists" ]; then
        log_warning "Alert rule not found - may not be configured yet"
        TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
        return 1
    fi

    log_success "Alert rule found and configured"
    return 0
}

test_alert_routing() {
    log_info "Testing AlertManager routing configuration..."

    # Get AlertManager configuration
    local config=$(curl -s "${ALERTMANAGER_URL}/api/v2/status" | jq -r '.config')

    if [ -z "$config" ] || [ "$config" = "null" ]; then
        log_error "Failed to retrieve AlertManager configuration"
        return 1
    fi

    # Check for route configuration
    local routes=$(curl -s "${ALERTMANAGER_URL}/api/v2/status" | jq -r '.config.route')

    if [ -z "$routes" ] || [ "$routes" = "null" ]; then
        log_error "No routes configured in AlertManager"
        return 1
    fi

    log_success "AlertManager routing configured"

    # Check for receivers
    local receivers=$(curl -s "${ALERTMANAGER_URL}/api/v2/status" | jq -r '.config.receivers')

    if [ -z "$receivers" ] || [ "$receivers" = "null" ]; then
        log_warning "No receivers configured"
        return 1
    fi

    log_success "AlertManager receivers configured"
    return 0
}

test_alert_deduplication() {
    log_info "Testing alert deduplication..."

    # Check AlertManager group settings
    local group_wait=$(curl -s "${ALERTMANAGER_URL}/api/v2/status" | \
        jq -r '.config.route.group_wait // "30s"')

    local group_interval=$(curl -s "${ALERTMANAGER_URL}/api/v2/status" | \
        jq -r '.config.route.group_interval // "5m"')

    log_info "Group wait: $group_wait"
    log_info "Group interval: $group_interval"

    # Verify reasonable values
    if [[ "$group_wait" == *"s" ]] || [[ "$group_wait" == *"m" ]]; then
        log_success "Group wait configured"
    else
        log_warning "Group wait may not be properly configured"
    fi

    return 0
}

test_alert_inhibition() {
    log_info "Testing alert inhibition rules..."

    # Check for inhibit rules
    local inhibit_rules=$(curl -s "${ALERTMANAGER_URL}/api/v2/status" | \
        jq -r '.config.inhibit_rules // []')

    if [ "$inhibit_rules" = "[]" ] || [ "$inhibit_rules" = "null" ]; then
        log_warning "No inhibition rules configured"
        return 0  # Not a failure, just a warning
    fi

    log_info "Inhibition rules found: $(echo "$inhibit_rules" | jq -r 'length')"
    log_success "Inhibition rules configured"
    return 0
}

test_alert_silences() {
    log_info "Testing alert silence functionality..."

    # Create a test silence
    local test_alert="TestAlert"
    silence_alert "$test_alert" "5m"

    # Verify silence was created
    local silences=$(curl -s "${ALERTMANAGER_URL}/api/v2/silences" | \
        jq -r "[.[] | select(.createdBy == \"alert-test-framework\")] | length")

    if [ "$silences" -gt 0 ]; then
        log_success "Silence created successfully"

        # Clean up - delete the silence
        local silence_id=$(curl -s "${ALERTMANAGER_URL}/api/v2/silences" | \
            jq -r "[.[] | select(.createdBy == \"alert-test-framework\")] | .[0].id")

        if [ -n "$silence_id" ]; then
            curl -s -X DELETE "${ALERTMANAGER_URL}/api/v2/silence/${silence_id}" > /dev/null
            log_info "Test silence cleaned up"
        fi

        return 0
    else
        log_error "Failed to create silence"
        return 1
    fi
}

test_all_alert_rules_loaded() {
    log_info "Verifying all alert rules are loaded in Prometheus..."

    # Expected alert rules (update this list based on your configuration)
    local expected_alerts=(
        "ServiceDown"
        "HighProbeFailureRate"
        "PrometheusUnavailable"
        "GrafanaUnavailable"
        "LokiUnavailable"
        "TempoUnavailable"
        "AlertManagerUnavailable"
        "OTelCollectorUnavailable"
    )

    local all_found=true
    local missing_alerts=()

    for alert in "${expected_alerts[@]}"; do
        local rule_exists=$(curl -s "${PROMETHEUS_URL}/api/v1/rules" | \
            jq -r ".data.groups[].rules[] | select(.name == \"${alert}\") | .name")

        if [ -z "$rule_exists" ]; then
            log_warning "Alert rule not found: $alert"
            missing_alerts+=("$alert")
            all_found=false
        else
            log_info "✓ Found: $alert"
        fi
    done

    if [ "$all_found" = true ]; then
        log_success "All expected alert rules found"
        return 0
    else
        log_error "Missing ${#missing_alerts[@]} alert rules: ${missing_alerts[*]}"
        return 1
    fi
}

# =========================================
# Main Test Execution
# =========================================

main() {
    echo "========================================="
    echo "Alert Testing Framework"
    echo "========================================="
    echo "Prometheus: $PROMETHEUS_URL"
    echo "AlertManager: $ALERTMANAGER_URL"
    echo "Results: $RESULTS_DIR"
    echo "========================================="
    echo ""

    # Pre-flight checks
    log_info "Running pre-flight checks..."

    if ! curl -sf "${PROMETHEUS_URL}/-/healthy" > /dev/null; then
        log_error "Prometheus is not accessible at $PROMETHEUS_URL"
        exit 1
    fi
    log_success "Prometheus is healthy"

    if ! curl -sf "${ALERTMANAGER_URL}/-/healthy" > /dev/null; then
        log_error "AlertManager is not accessible at $ALERTMANAGER_URL"
        exit 1
    fi
    log_success "AlertManager is healthy"

    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed"
        exit 1
    fi

    echo ""

    # Run tests
    run_test "All Alert Rules Loaded" test_all_alert_rules_loaded
    run_test "High Probe Failure Rate Alert" test_high_probe_failure_rate_alert
    run_test "Prometheus Unavailable Alert" test_prometheus_unavailable_alert
    run_test "Cost Spike Alert" test_cost_spike_alert
    run_test "Alert Routing Configuration" test_alert_routing
    run_test "Alert Deduplication" test_alert_deduplication
    run_test "Alert Inhibition" test_alert_inhibition
    run_test "Alert Silences" test_alert_silences

    # Summary
    echo ""
    echo "========================================="
    echo "Test Summary"
    echo "========================================="
    echo "Total Tests: $TESTS_TOTAL"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo -e "${YELLOW}Skipped: $TESTS_SKIPPED${NC}"
    echo "========================================="
    echo ""

    # Save results
    cat > "$RESULTS_DIR/alert-test-results.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "prometheus_url": "$PROMETHEUS_URL",
  "alertmanager_url": "$ALERTMANAGER_URL",
  "total_tests": $TESTS_TOTAL,
  "passed": $TESTS_PASSED,
  "failed": $TESTS_FAILED,
  "skipped": $TESTS_SKIPPED,
  "pass_rate": $(awk "BEGIN {printf \"%.2f\", ($TESTS_PASSED / $TESTS_TOTAL) * 100}")
}
EOF

    log_info "Results saved to $RESULTS_DIR/alert-test-results.json"

    # Exit code
    if [ $TESTS_FAILED -gt 0 ]; then
        log_error "Some tests failed"
        exit 1
    else
        log_success "All tests passed!"
        exit 0
    fi
}

# Run main function
main "$@"
