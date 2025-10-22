#!/bin/bash
# Chaos Engineering Test Runner
# Executes chaos experiments and validates system recovery

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="observability"
CHAOS_MESH_NAMESPACE="chaos-mesh"
RESULTS_DIR="./chaos-results"

# Test tracking
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Create results directory
mkdir -p "$RESULTS_DIR"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found"
        exit 1
    fi

    # Check Chaos Mesh is installed
    if ! kubectl get namespace "$CHAOS_MESH_NAMESPACE" &> /dev/null; then
        log_error "Chaos Mesh namespace not found. Install Chaos Mesh first:"
        echo "  helm repo add chaos-mesh https://charts.chaos-mesh.org"
        echo "  helm install chaos-mesh chaos-mesh/chaos-mesh -n chaos-mesh --create-namespace"
        exit 1
    fi

    # Check observability namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Observability namespace not found"
        exit 1
    fi

    log_success "Prerequisites met"
}

# Apply chaos experiment
apply_chaos() {
    local experiment_file="$1"
    local experiment_name=$(basename "$experiment_file" .yaml)

    log_info "Applying chaos experiment: $experiment_name"

    if kubectl apply -f "$experiment_file"; then
        log_success "Chaos experiment applied"
        return 0
    else
        log_error "Failed to apply chaos experiment"
        return 1
    fi
}

# Wait for chaos to complete
wait_for_chaos_completion() {
    local experiment_name="$1"
    local timeout="${2:-300}"  # 5 minutes default
    local start_time=$(date +%s)

    log_info "Waiting for chaos experiment to complete (timeout: ${timeout}s)..."

    while true; do
        local elapsed=$(($(date +%s) - start_time))

        if [ $elapsed -gt $timeout ]; then
            log_error "Timeout waiting for chaos experiment"
            return 1
        fi

        # Check if experiment exists
        if ! kubectl get podchaos,networkchaos,stresschaos,iochaos -n "$NAMESPACE" "$experiment_name" &> /dev/null; then
            log_warning "Experiment not found or completed"
            return 0
        fi

        # Check experiment status
        local status=$(kubectl get podchaos,networkchaos,stresschaos,iochaos -n "$NAMESPACE" "$experiment_name" -o jsonpath='{.status.experiment.phase}' 2>/dev/null || echo "Unknown")

        if [ "$status" = "Finished" ]; then
            log_success "Chaos experiment completed"
            return 0
        fi

        echo -n "."
        sleep 5
    done
}

# Verify system recovery
verify_recovery() {
    local service="$1"
    local endpoint="$2"
    local timeout="${3:-180}"
    local start_time=$(date +%s)

    log_info "Verifying $service recovery..."

    while true; do
        local elapsed=$(($(date +%s) - start_time))

        if [ $elapsed -gt $timeout ]; then
            log_error "$service did not recover within ${timeout}s"
            return 1
        fi

        # Check if service is healthy
        if kubectl exec -n "$NAMESPACE" deploy/prometheus -- wget -q --spider "$endpoint" 2>/dev/null; then
            log_success "$service recovered after ${elapsed}s"
            return 0
        fi

        echo -n "."
        sleep 5
    done
}

# Clean up chaos experiments
cleanup_chaos() {
    log_info "Cleaning up chaos experiments..."

    kubectl delete podchaos,networkchaos,stresschaos,iochaos --all -n "$NAMESPACE" 2>/dev/null || true

    log_success "Cleanup complete"
}

# Run specific chaos test
run_chaos_test() {
    local test_name="$1"
    local experiment_file="$2"
    local validation_func="$3"

    TESTS_RUN=$((TESTS_RUN + 1))

    echo ""
    echo "========================================="
    echo "Test $TESTS_RUN: $test_name"
    echo "========================================="

    # Apply chaos
    if ! apply_chaos "$experiment_file"; then
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi

    # Wait a bit for chaos to take effect
    sleep 10

    # Run validation
    if $validation_func; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        log_success "Test passed: $test_name"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        log_error "Test failed: $test_name"
        return 1
    fi
}

# Validation functions
validate_prometheus_recovery() {
    verify_recovery "Prometheus" "http://prometheus:9090/-/healthy" 120
}

validate_loki_recovery() {
    verify_recovery "Loki" "http://loki:3100/ready" 180
}

validate_tempo_recovery() {
    verify_recovery "Tempo" "http://tempo:3200/ready" 180
}

validate_otel_recovery() {
    verify_recovery "OTel Collector" "http://otel-collector:13133" 120
}

# Main test execution
main() {
    echo "========================================="
    echo "Chaos Engineering Test Suite"
    echo "========================================="
    echo "Namespace: $NAMESPACE"
    echo "Results: $RESULTS_DIR"
    echo "========================================="
    echo ""

    # Check prerequisites
    check_prerequisites

    # Clean up any existing experiments
    cleanup_chaos

    # Parse command line arguments
    local test_type="${1:-comprehensive}"

    case "$test_type" in
        pod-failure)
            log_info "Running pod failure tests..."
            run_chaos_test "Prometheus Pod Failure" "pod-failure-prometheus.yaml" validate_prometheus_recovery
            ;;

        network)
            log_info "Running network chaos tests..."
            run_chaos_test "Loki Network Partition" "network-chaos-loki.yaml" validate_loki_recovery
            ;;

        stress)
            log_info "Running stress tests..."
            run_chaos_test "Tempo Resource Stress" "stress-chaos-tempo.yaml" validate_tempo_recovery
            ;;

        otel)
            log_info "Running OTel Collector chaos tests..."
            run_chaos_test "OTel Collector Chaos" "otel-collector-chaos.yaml" validate_otel_recovery
            ;;

        comprehensive)
            log_info "Running comprehensive chaos test workflow..."

            # Apply comprehensive workflow
            if kubectl apply -f comprehensive-chaos-scenario.yaml; then
                log_success "Chaos workflow started"

                # Monitor workflow progress
                log_info "Monitoring workflow (this may take 30+ minutes)..."

                for i in $(seq 1 60); do
                    local status=$(kubectl get workflow observability-stack-chaos-test -n "$NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")

                    if [ "$status" = "Succeeded" ]; then
                        log_success "Chaos workflow completed successfully"
                        TESTS_PASSED=$((TESTS_PASSED + 1))
                        break
                    elif [ "$status" = "Failed" ]; then
                        log_error "Chaos workflow failed"
                        TESTS_FAILED=$((TESTS_FAILED + 1))
                        break
                    fi

                    echo "Workflow status: $status (check $i/60)"
                    sleep 30
                done

                TESTS_RUN=$((TESTS_RUN + 1))
            else
                log_error "Failed to start chaos workflow"
                TESTS_FAILED=$((TESTS_FAILED + 1))
                TESTS_RUN=$((TESTS_RUN + 1))
            fi
            ;;

        *)
            log_error "Unknown test type: $test_type"
            echo "Valid options: pod-failure, network, stress, otel, comprehensive"
            exit 1
            ;;
    esac

    # Cleanup
    cleanup_chaos

    # Summary
    echo ""
    echo "========================================="
    echo "Test Summary"
    echo "========================================="
    echo "Total Tests: $TESTS_RUN"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo "========================================="

    # Save results
    cat > "$RESULTS_DIR/chaos-test-results.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "test_type": "$test_type",
  "namespace": "$NAMESPACE",
  "tests_run": $TESTS_RUN,
  "tests_passed": $TESTS_PASSED,
  "tests_failed": $TESTS_FAILED,
  "pass_rate": $(awk "BEGIN {if ($TESTS_RUN > 0) printf \"%.2f\", ($TESTS_PASSED / $TESTS_RUN) * 100; else print 0}")
}
EOF

    log_info "Results saved to $RESULTS_DIR/chaos-test-results.json"

    # Exit code
    if [ $TESTS_FAILED -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main
main "$@"
