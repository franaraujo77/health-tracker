#!/bin/bash
# Run Observability Load Tests
# Executes k6 load tests against metrics, logs, and traces endpoints

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
K6_IMAGE="grafana/k6:0.48.0"
RESULTS_DIR="./results"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus:9090}"
LOKI_URL="${LOKI_URL:-http://loki:3100}"
TEMPO_URL="${TEMPO_URL:-http://tempo:4318}"

# Parse arguments
TEST_TYPE="${1:-comprehensive}"  # metrics, logs, traces, or comprehensive
DURATION="${2:-short}"           # short, medium, or long

echo -e "${BLUE}========================================"
echo "Observability Load Test Runner"
echo -e "========================================${NC}"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# Set test parameters based on duration
case "$DURATION" in
  short)
    export K6_VUS=25
    export K6_DURATION="2m"
    echo "Duration: Short (2 minutes, 25 VUs)"
    ;;
  medium)
    export K6_VUS=50
    export K6_DURATION="5m"
    echo "Duration: Medium (5 minutes, 50 VUs)"
    ;;
  long)
    export K6_VUS=100
    export K6_DURATION="10m"
    echo "Duration: Long (10 minutes, 100 VUs)"
    ;;
  *)
    echo -e "${RED}Invalid duration: $DURATION${NC}"
    echo "Valid options: short, medium, long"
    exit 1
    ;;
esac

# Select test script
case "$TEST_TYPE" in
  metrics)
    SCRIPT="k6/load-test-metrics.js"
    echo "Test Type: Metrics Ingestion (Prometheus)"
    ;;
  logs)
    SCRIPT="k6/load-test-logs.js"
    echo "Test Type: Log Ingestion (Loki)"
    ;;
  traces)
    SCRIPT="k6/load-test-traces.js"
    echo "Test Type: Trace Ingestion (Tempo)"
    ;;
  comprehensive)
    SCRIPT="k6/load-test-comprehensive.js"
    echo "Test Type: Comprehensive (All Components)"
    ;;
  *)
    echo -e "${RED}Invalid test type: $TEST_TYPE${NC}"
    echo "Valid options: metrics, logs, traces, comprehensive"
    exit 1
    ;;
esac

echo "Script: $SCRIPT"
echo "Targets:"
echo "  - Prometheus: $PROMETHEUS_URL"
echo "  - Loki: $LOKI_URL"
echo "  - Tempo: $TEMPO_URL"
echo ""

# Pre-flight checks
echo -e "${YELLOW}Running pre-flight checks...${NC}"

# Check if services are accessible
if command -v kubectl &> /dev/null; then
  echo -n "  Checking Prometheus... "
  if kubectl exec -n observability prometheus-0 -- wget -q --spider http://localhost:9090/-/healthy 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
  else
    echo -e "${RED}FAIL${NC}"
    echo -e "${YELLOW}Warning: Prometheus may not be accessible${NC}"
  fi

  echo -n "  Checking Loki... "
  if kubectl exec -n observability loki-0 -- wget -q --spider http://localhost:3100/ready 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
  else
    echo -e "${RED}FAIL${NC}"
    echo -e "${YELLOW}Warning: Loki may not be accessible${NC}"
  fi

  echo -n "  Checking Tempo... "
  if kubectl get pod -n observability -l app=tempo &>/dev/null; then
    echo -e "${GREEN}OK${NC}"
  else
    echo -e "${YELLOW}WARN${NC} (Tempo pod check failed)"
  fi
else
  echo -e "${YELLOW}kubectl not available, skipping service checks${NC}"
fi

echo ""
echo -e "${GREEN}Starting load test...${NC}"
echo ""

# Run k6 test
TEST_RUN_ID="$(date +%Y%m%d-%H%M%S)"
RESULTS_FILE="$RESULTS_DIR/results-${TEST_TYPE}-${DURATION}-${TEST_RUN_ID}.json"
SUMMARY_FILE="$RESULTS_DIR/summary-${TEST_TYPE}-${DURATION}-${TEST_RUN_ID}.txt"

if command -v k6 &> /dev/null; then
  # Run with local k6
  k6 run \
    --out "json=$RESULTS_FILE" \
    --summary-export="$RESULTS_DIR/summary-${TEST_TYPE}-${DURATION}-${TEST_RUN_ID}.json" \
    -e PROMETHEUS_URL="$PROMETHEUS_URL" \
    -e LOKI_URL="$LOKI_URL" \
    -e TEMPO_URL="$TEMPO_URL" \
    -e TEST_RUN_ID="$TEST_RUN_ID" \
    "$SCRIPT" | tee "$SUMMARY_FILE"
  TEST_EXIT_CODE=$?
elif command -v docker &> /dev/null; then
  # Run with Docker
  docker run --rm \
    --network host \
    -v "$(pwd)/k6:/scripts:ro" \
    -v "$(pwd)/$RESULTS_DIR:/results" \
    -e PROMETHEUS_URL="$PROMETHEUS_URL" \
    -e LOKI_URL="$LOKI_URL" \
    -e TEMPO_URL="$TEMPO_URL" \
    -e TEST_RUN_ID="$TEST_RUN_ID" \
    "$K6_IMAGE" \
    run \
    --out "json=/results/results-${TEST_TYPE}-${DURATION}-${TEST_RUN_ID}.json" \
    --summary-export="/results/summary-${TEST_TYPE}-${DURATION}-${TEST_RUN_ID}.json" \
    "/scripts/$(basename $SCRIPT)" | tee "$SUMMARY_FILE"
  TEST_EXIT_CODE=$?
else
  echo -e "${RED}Error: Neither k6 nor Docker is available${NC}"
  echo "Install k6: https://k6.io/docs/getting-started/installation/"
  echo "Or install Docker: https://docs.docker.com/get-docker/"
  exit 1
fi

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}========================================"
  echo "Load test completed successfully!"
  echo -e "========================================${NC}"
else
  echo -e "${RED}========================================"
  echo "Load test failed!"
  echo -e "========================================${NC}"
fi

echo ""
echo "Results saved to:"
echo "  - JSON: $RESULTS_FILE"
echo "  - Summary: $SUMMARY_FILE"
echo ""
echo "Next steps:"
echo "1. Review results in $RESULTS_DIR"
echo "2. Check Grafana dashboards for impact"
echo "3. Compare against performance baselines (see PERFORMANCE-BASELINES.md)"
echo "4. If thresholds failed, investigate bottlenecks"
echo ""

exit $TEST_EXIT_CODE
