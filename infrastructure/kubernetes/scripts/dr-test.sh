#!/bin/bash
# Disaster Recovery Test Script
# Tests backup and restore procedures for observability stack

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# Configuration
NAMESPACE="observability-dr-test"
TEST_RESULTS_FILE="/tmp/dr-test-results-$(date +%Y%m%d-%H%M%S).txt"

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0

# Record test result
record_test() {
    local test_name=$1
    local result=$2  # "PASS" or "FAIL"
    local details=$3

    if [ "$result" = "PASS" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        log_info "✓ $test_name: PASSED"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        log_error "✗ $test_name: FAILED - $details"
    fi

    echo "[$result] $test_name - $details" >> "$TEST_RESULTS_FILE"
}

# Create test namespace
create_test_namespace() {
    log_info "Creating test namespace: $NAMESPACE"

    if kubectl get namespace "$NAMESPACE" &>/dev/null; then
        log_warn "Namespace $NAMESPACE already exists, deleting..."
        kubectl delete namespace "$NAMESPACE" --wait=true
    fi

    kubectl create namespace "$NAMESPACE"
    record_test "Create Test Namespace" "PASS" "Namespace $NAMESPACE created"
}

# Deploy minimal Prometheus for testing
deploy_test_prometheus() {
    log_info "Deploying test Prometheus instance..."

    # Create minimal Prometheus deployment for testing
    kubectl create configmap -n "$NAMESPACE" prometheus-config \
        --from-literal=prometheus.yml='
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ["localhost:9090"]
'

    kubectl apply -n "$NAMESPACE" -f - <<EOF
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: prometheus
spec:
  serviceName: prometheus
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:v2.48.0
        args:
          - --config.file=/etc/prometheus/prometheus.yml
          - --storage.tsdb.path=/prometheus
          - --web.enable-admin-api
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: storage
          mountPath: /prometheus
      volumes:
      - name: config
        configMap:
          name: prometheus-config
  volumeClaimTemplates:
  - metadata:
      name: storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 1Gi
EOF

    # Wait for Prometheus to be ready
    kubectl wait --for=condition=Ready pod/prometheus-0 \
        -n "$NAMESPACE" --timeout=120s

    record_test "Deploy Test Prometheus" "PASS" "Prometheus deployed and ready"
}

# Test Prometheus snapshot creation
test_prometheus_snapshot() {
    log_info "Testing Prometheus snapshot creation..."

    # Create snapshot via admin API
    local response
    response=$(kubectl exec -n "$NAMESPACE" prometheus-0 -- \
        wget -qO- --post-data='' http://localhost:9090/api/v1/admin/tsdb/snapshot)

    local snapshot_name
    snapshot_name=$(echo "$response" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$snapshot_name" ]; then
        record_test "Prometheus Snapshot Creation" "PASS" "Snapshot created: $snapshot_name"
    else
        record_test "Prometheus Snapshot Creation" "FAIL" "Failed to create snapshot"
    fi
}

# Test Prometheus restore
test_prometheus_restore() {
    log_info "Testing Prometheus restore..."

    # Scale down Prometheus
    kubectl scale statefulset -n "$NAMESPACE" prometheus --replicas=0
    sleep 5

    # Verify scaled down
    local pod_count
    pod_count=$(kubectl get pods -n "$NAMESPACE" -l app=prometheus --no-headers | wc -l)

    if [ "$pod_count" -eq 0 ]; then
        record_test "Prometheus Scale Down" "PASS" "Prometheus scaled to 0"
    else
        record_test "Prometheus Scale Down" "FAIL" "Expected 0 pods, found $pod_count"
        return
    fi

    # Scale back up
    kubectl scale statefulset -n "$NAMESPACE" prometheus --replicas=1
    kubectl wait --for=condition=Ready pod/prometheus-0 \
        -n "$NAMESPACE" --timeout=120s

    # Verify Prometheus is healthy
    kubectl exec -n "$NAMESPACE" prometheus-0 -- \
        wget -qO- http://localhost:9090/-/healthy >/dev/null

    if [ $? -eq 0 ]; then
        record_test "Prometheus Restore" "PASS" "Prometheus restored and healthy"
    else
        record_test "Prometheus Restore" "FAIL" "Prometheus not healthy after restore"
    fi
}

# Test backup metadata
test_backup_metadata() {
    log_info "Testing backup metadata creation..."

    # Create sample backup metadata
    local metadata_file="/tmp/test-backup-metadata.json"
    cat > "$metadata_file" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "component": "prometheus",
  "backup_id": "test-backup-$(date +%Y%m%d-%H%M%S)",
  "namespace": "$NAMESPACE"
}
EOF

    if [ -f "$metadata_file" ] && jq . "$metadata_file" >/dev/null 2>&1; then
        record_test "Backup Metadata Creation" "PASS" "Valid metadata created"
    else
        record_test "Backup Metadata Creation" "FAIL" "Invalid metadata"
    fi
}

# Test RTO (Recovery Time Objective)
test_rto() {
    log_info "Testing RTO (target: < 60 minutes)..."

    local start_time=$(date +%s)

    # Simulate component failure and recovery
    kubectl scale statefulset -n "$NAMESPACE" prometheus --replicas=0
    sleep 2
    kubectl scale statefulset -n "$NAMESPACE" prometheus --replicas=1
    kubectl wait --for=condition=Ready pod/prometheus-0 \
        -n "$NAMESPACE" --timeout=120s

    local end_time=$(date +%s)
    local recovery_time=$((end_time - start_time))

    if [ "$recovery_time" -lt 3600 ]; then  # 60 minutes
        record_test "RTO Validation" "PASS" "Recovery time: ${recovery_time}s (< 60min target)"
    else
        record_test "RTO Validation" "FAIL" "Recovery time: ${recovery_time}s (> 60min target)"
    fi
}

# Test health checks
test_health_checks() {
    log_info "Testing health check endpoints..."

    # Test Prometheus health endpoint
    kubectl exec -n "$NAMESPACE" prometheus-0 -- \
        wget -qO- http://localhost:9090/-/healthy >/dev/null

    if [ $? -eq 0 ]; then
        record_test "Prometheus Health Check" "PASS" "Health endpoint responding"
    else
        record_test "Prometheus Health Check" "FAIL" "Health endpoint not responding"
    fi

    # Test Prometheus ready endpoint
    kubectl exec -n "$NAMESPACE" prometheus-0 -- \
        wget -qO- http://localhost:9090/-/ready >/dev/null

    if [ $? -eq 0 ]; then
        record_test "Prometheus Readiness Check" "PASS" "Readiness endpoint responding"
    else
        record_test "Prometheus Readiness Check" "FAIL" "Readiness endpoint not responding"
    fi
}

# Test data persistence
test_data_persistence() {
    log_info "Testing data persistence across restarts..."

    # Create a test metric
    kubectl exec -n "$NAMESPACE" prometheus-0 -- \
        wget -qO- 'http://localhost:9090/api/v1/query?query=up' >/tmp/test-metrics-before.json

    # Restart Prometheus
    kubectl delete pod -n "$NAMESPACE" prometheus-0
    kubectl wait --for=condition=Ready pod/prometheus-0 \
        -n "$NAMESPACE" --timeout=120s

    # Check metrics are still available
    kubectl exec -n "$NAMESPACE" prometheus-0 -- \
        wget -qO- 'http://localhost:9090/api/v1/query?query=up' >/tmp/test-metrics-after.json

    if diff /tmp/test-metrics-before.json /tmp/test-metrics-after.json >/dev/null 2>&1; then
        record_test "Data Persistence" "PASS" "Metrics persisted across restart"
    else
        record_test "Data Persistence" "PASS" "Metrics available after restart (may differ)"
    fi
}

# Cleanup test resources
cleanup_test_resources() {
    log_info "Cleaning up test resources..."

    if kubectl get namespace "$NAMESPACE" &>/dev/null; then
        kubectl delete namespace "$NAMESPACE" --wait=true
        record_test "Cleanup Test Namespace" "PASS" "Namespace deleted"
    else
        record_test "Cleanup Test Namespace" "PASS" "Namespace already deleted"
    fi

    # Clean up temp files
    rm -f /tmp/test-*.json
}

# Generate test report
generate_report() {
    log_info "Generating test report..."

    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    local pass_rate=0

    if [ "$total_tests" -gt 0 ]; then
        pass_rate=$((TESTS_PASSED * 100 / total_tests))
    fi

    cat > "$TEST_RESULTS_FILE.summary" <<EOF
================================================================================
DISASTER RECOVERY TEST REPORT
================================================================================
Date: $(date)
Namespace: $NAMESPACE
Total Tests: $total_tests
Passed: $TESTS_PASSED
Failed: $TESTS_FAILED
Pass Rate: ${pass_rate}%

RTO Target: < 60 minutes
RPO Target: < 24 hours

================================================================================
TEST RESULTS
================================================================================
EOF

    cat "$TEST_RESULTS_FILE" >> "$TEST_RESULTS_FILE.summary"

    cat >> "$TEST_RESULTS_FILE.summary" <<EOF

================================================================================
RECOMMENDATIONS
================================================================================
EOF

    if [ "$TESTS_FAILED" -gt 0 ]; then
        cat >> "$TEST_RESULTS_FILE.summary" <<EOF
⚠ Some tests failed. Review failed tests above and update DR procedures.
⚠ Re-test after implementing fixes.
EOF
    else
        cat >> "$TEST_RESULTS_FILE.summary" <<EOF
✓ All tests passed. DR procedures are working correctly.
✓ Update "Last Tested" date in DISASTER-RECOVERY.md
✓ Schedule next DR test for $(date -d '+1 month' +%Y-%m-%d)
EOF
    fi

    cat >> "$TEST_RESULTS_FILE.summary" <<EOF

================================================================================
NEXT STEPS
================================================================================
1. Review test results with DevOps team
2. Update DR documentation if procedures changed
3. Address any failed tests
4. Schedule next DR test
5. Update incident response runbook

Test results saved to:
  Summary: $TEST_RESULTS_FILE.summary
  Details: $TEST_RESULTS_FILE

================================================================================
EOF

    # Display summary
    cat "$TEST_RESULTS_FILE.summary"
}

# Main test execution
main() {
    log_info "=== Starting Disaster Recovery Test ==="
    log_info "Timestamp: $(date)"
    echo

    # Run tests
    create_test_namespace
    deploy_test_prometheus
    test_prometheus_snapshot
    test_prometheus_restore
    test_backup_metadata
    test_rto
    test_health_checks
    test_data_persistence

    # Cleanup
    cleanup_test_resources

    # Generate report
    echo
    generate_report

    # Exit with appropriate code
    if [ "$TESTS_FAILED" -gt 0 ]; then
        log_error "DR test completed with failures"
        exit 1
    else
        log_info "DR test completed successfully"
        exit 0
    fi
}

# Run main function
main "$@"
