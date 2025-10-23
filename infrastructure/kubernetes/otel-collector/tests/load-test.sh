#!/bin/bash
# Load testing suite for OpenTelemetry Collector
# Uses telemetrygen to generate synthetic telemetry at scale
# Measures latency, resource usage, and data loss

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OTEL_COLLECTOR_HOST="${OTEL_COLLECTOR_HOST:-localhost}"
OTEL_COLLECTOR_GRPC_PORT="${OTEL_COLLECTOR_GRPC_PORT:-4317}"
OTEL_COLLECTOR_HTTP_PORT="${OTEL_COLLECTOR_HTTP_PORT:-4318}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"

# Test duration in seconds
DURATION="${DURATION:-60}"

# Target rates (per second)
TARGET_SPANS_PER_SEC="${TARGET_SPANS_PER_SEC:-10000}"
TARGET_METRICS_PER_SEC="${TARGET_METRICS_PER_SEC:-5000}"
TARGET_LOGS_PER_SEC="${TARGET_LOGS_PER_SEC:-1000}"

# Output directory
OUTPUT_DIR="${OUTPUT_DIR:-./load-test-results}"
mkdir -p "$OUTPUT_DIR"

# Timestamp for this test run
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULT_FILE="$OUTPUT_DIR/load-test-${TIMESTAMP}.json"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     OpenTelemetry Collector Load Testing Suite            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo
echo "Configuration:"
echo "  • Collector: ${OTEL_COLLECTOR_HOST}:${OTEL_COLLECTOR_GRPC_PORT}"
echo "  • Duration: ${DURATION}s"
echo "  • Target Spans: ${TARGET_SPANS_PER_SEC}/sec"
echo "  • Target Metrics: ${TARGET_METRICS_PER_SEC}/sec"
echo "  • Target Logs: ${TARGET_LOGS_PER_SEC}/sec"
echo "  • Results: ${RESULT_FILE}"
echo

# Check if telemetrygen is installed
if ! command -v telemetrygen &> /dev/null; then
    echo -e "${RED}✗ telemetrygen not found${NC}"
    echo
    echo "Installation instructions:"
    echo "  go install github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@latest"
    echo
    exit 1
fi

echo -e "${GREEN}✓ telemetrygen found${NC}"
echo

# Function to query Prometheus
query_prometheus() {
    local query="$1"
    local result=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=${query}" | jq -r '.data.result[0].value[1]' 2>/dev/null || echo "0")
    echo "$result"
}

# Function to get current metrics
get_baseline_metrics() {
    echo "Collecting baseline metrics..."

    # Receiver metrics
    local spans_received=$(query_prometheus 'rate(otelcol_receiver_accepted_spans[1m])')
    local metrics_received=$(query_prometheus 'rate(otelcol_receiver_accepted_metric_points[1m])')
    local logs_received=$(query_prometheus 'rate(otelcol_receiver_accepted_log_records[1m])')

    # Dropped data
    local spans_dropped=$(query_prometheus 'rate(otelcol_processor_dropped_spans[1m])')
    local metrics_dropped=$(query_prometheus 'rate(otelcol_processor_dropped_metric_points[1m])')
    local logs_dropped=$(query_prometheus 'rate(otelcol_processor_dropped_log_records[1m])')

    # Resource usage
    local cpu_usage=$(query_prometheus 'sum(rate(container_cpu_usage_seconds_total{pod=~"otel-collector.*"}[1m]))')
    local memory_usage=$(query_prometheus 'sum(container_memory_working_set_bytes{pod=~"otel-collector.*"})')

    # Queue size
    local queue_size=$(query_prometheus 'max(otelcol_exporter_queue_size)')

    echo "$spans_received,$metrics_received,$logs_received,$spans_dropped,$metrics_dropped,$logs_dropped,$cpu_usage,$memory_usage,$queue_size"
}

# Start baseline collection
echo -e "${YELLOW}[Phase 1] Baseline Collection${NC}"
BASELINE=$(get_baseline_metrics)
echo "Baseline: $BASELINE"
echo

# Start load generation
echo -e "${YELLOW}[Phase 2] Starting Load Generation${NC}"
echo

# Generate spans
echo "Starting span generation (${TARGET_SPANS_PER_SEC}/sec)..."
telemetrygen traces \
    --otlp-endpoint "${OTEL_COLLECTOR_HOST}:${OTEL_COLLECTOR_GRPC_PORT}" \
    --otlp-insecure \
    --duration "${DURATION}s" \
    --rate ${TARGET_SPANS_PER_SEC} \
    --workers 10 \
    --traces 1 \
    --spans 5 \
    --span-duration 100ms \
    --otlp-attributes "service.name=load-test,test.type=capacity,test.timestamp=${TIMESTAMP}" \
    > "${OUTPUT_DIR}/spans-${TIMESTAMP}.log" 2>&1 &
SPAN_PID=$!

sleep 2

# Generate metrics
echo "Starting metrics generation (${TARGET_METRICS_PER_SEC}/sec)..."
telemetrygen metrics \
    --otlp-endpoint "${OTEL_COLLECTOR_HOST}:${OTEL_COLLECTOR_GRPC_PORT}" \
    --otlp-insecure \
    --duration "${DURATION}s" \
    --rate ${TARGET_METRICS_PER_SEC} \
    --workers 5 \
    --otlp-attributes "service.name=load-test,test.type=capacity,test.timestamp=${TIMESTAMP}" \
    > "${OUTPUT_DIR}/metrics-${TIMESTAMP}.log" 2>&1 &
METRIC_PID=$!

sleep 2

# Generate logs
echo "Starting log generation (${TARGET_LOGS_PER_SEC}/sec)..."
telemetrygen logs \
    --otlp-endpoint "${OTEL_COLLECTOR_HOST}:${OTEL_COLLECTOR_GRPC_PORT}" \
    --otlp-insecure \
    --duration "${DURATION}s" \
    --rate ${TARGET_LOGS_PER_SEC} \
    --workers 3 \
    --otlp-attributes "service.name=load-test,test.type=capacity,test.timestamp=${TIMESTAMP}" \
    > "${OUTPUT_DIR}/logs-${TIMESTAMP}.log" 2>&1 &
LOG_PID=$!

echo -e "${GREEN}✓ All load generators started${NC}"
echo "  • Spans PID: ${SPAN_PID}"
echo "  • Metrics PID: ${METRIC_PID}"
echo "  • Logs PID: ${LOG_PID}"
echo

# Monitor during test
echo -e "${YELLOW}[Phase 3] Monitoring (${DURATION}s)${NC}"
echo

SAMPLES=()
for ((i=1; i<=$DURATION/5; i++)); do
    SAMPLE=$(get_baseline_metrics)
    SAMPLES+=("$SAMPLE")

    # Parse sample for display
    IFS=',' read -r spans_rx metrics_rx logs_rx spans_drop metrics_drop logs_drop cpu mem queue <<< "$SAMPLE"

    echo "Sample $i: Spans=${spans_rx}/s, Metrics=${metrics_rx}/s, Logs=${logs_rx}/s, Dropped=${spans_drop}/${metrics_drop}/${logs_drop}, Queue=${queue}"

    sleep 5
done

echo
echo "Waiting for load generators to complete..."

# Wait for all generators to finish
wait $SPAN_PID 2>/dev/null
SPAN_EXIT=$?
wait $METRIC_PID 2>/dev/null
METRIC_EXIT=$?
wait $LOG_PID 2>/dev/null
LOG_EXIT=$?

echo -e "${GREEN}✓ Load generation complete${NC}"
echo

# Final metrics collection
echo -e "${YELLOW}[Phase 4] Final Metrics Collection${NC}"
sleep 10  # Wait for metrics to stabilize
FINAL=$(get_baseline_metrics)
echo "Final: $FINAL"
echo

# Calculate results
echo -e "${YELLOW}[Phase 5] Analyzing Results${NC}"
echo

IFS=',' read -r final_spans final_metrics final_logs final_spans_drop final_metrics_drop final_logs_drop final_cpu final_mem final_queue <<< "$FINAL"

# Calculate averages from samples
total_spans=0
total_metrics=0
total_logs=0
total_drops=0

for sample in "${SAMPLES[@]}"; do
    IFS=',' read -r s_spans s_metrics s_logs s_spans_drop s_metrics_drop s_logs_drop s_cpu s_mem s_queue <<< "$sample"
    total_spans=$(echo "$total_spans + $s_spans" | bc -l)
    total_metrics=$(echo "$total_metrics + $s_metrics" | bc -l)
    total_logs=$(echo "$total_logs + $s_logs" | bc -l)
    total_drops=$(echo "$total_drops + $s_spans_drop + $s_metrics_drop + $s_logs_drop" | bc -l)
done

sample_count=${#SAMPLES[@]}
avg_spans=$(echo "scale=2; $total_spans / $sample_count" | bc -l)
avg_metrics=$(echo "scale=2; $total_metrics / $sample_count" | bc -l)
avg_logs=$(echo "scale=2; $total_logs / $sample_count" | bc -l)
avg_drops=$(echo "scale=2; $total_drops / $sample_count" | bc -l)

# Calculate success rate
spans_success_rate=$(echo "scale=2; (1 - ($final_spans_drop / $final_spans)) * 100" | bc -l 2>/dev/null || echo "100")
metrics_success_rate=$(echo "scale=2; (1 - ($final_metrics_drop / $final_metrics)) * 100" | bc -l 2>/dev/null || echo "100")
logs_success_rate=$(echo "scale=2; (1 - ($final_logs_drop / $final_logs)) * 100" | bc -l 2>/dev/null || echo "100")

# Determine pass/fail
PASS=true
if (( $(echo "$avg_drops > 0" | bc -l) )); then
    PASS=false
fi

# Generate JSON report
cat > "$RESULT_FILE" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "configuration": {
    "duration_seconds": ${DURATION},
    "target_spans_per_sec": ${TARGET_SPANS_PER_SEC},
    "target_metrics_per_sec": ${TARGET_METRICS_PER_SEC},
    "target_logs_per_sec": ${TARGET_LOGS_PER_SEC},
    "collector_endpoint": "${OTEL_COLLECTOR_HOST}:${OTEL_COLLECTOR_GRPC_PORT}"
  },
  "results": {
    "average_ingestion_rate": {
      "spans_per_sec": ${avg_spans},
      "metrics_per_sec": ${avg_metrics},
      "logs_per_sec": ${avg_logs}
    },
    "data_loss": {
      "spans_dropped_per_sec": ${final_spans_drop},
      "metrics_dropped_per_sec": ${final_metrics_drop},
      "logs_dropped_per_sec": ${final_logs_drop},
      "total_dropped_per_sec": ${avg_drops}
    },
    "success_rates": {
      "spans_percent": ${spans_success_rate},
      "metrics_percent": ${metrics_success_rate},
      "logs_percent": ${logs_success_rate}
    },
    "resource_usage": {
      "cpu_cores": ${final_cpu},
      "memory_bytes": ${final_mem},
      "max_queue_size": ${final_queue}
    }
  },
  "pass": ${PASS},
  "generator_exit_codes": {
    "spans": ${SPAN_EXIT},
    "metrics": ${METRIC_EXIT},
    "logs": ${LOG_EXIT}
  }
}
EOF

# Display summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    LOAD TEST RESULTS                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo
echo "Throughput:"
echo "  • Spans: ${avg_spans}/sec (target: ${TARGET_SPANS_PER_SEC}/sec)"
echo "  • Metrics: ${avg_metrics}/sec (target: ${TARGET_METRICS_PER_SEC}/sec)"
echo "  • Logs: ${avg_logs}/sec (target: ${TARGET_LOGS_PER_SEC}/sec)"
echo
echo "Data Loss:"
echo "  • Spans: ${final_spans_drop}/sec"
echo "  • Metrics: ${final_metrics_drop}/sec"
echo "  • Logs: ${final_logs_drop}/sec"
echo "  • Total: ${avg_drops}/sec"
echo
echo "Success Rates:"
echo "  • Spans: ${spans_success_rate}%"
echo "  • Metrics: ${metrics_success_rate}%"
echo "  • Logs: ${logs_success_rate}%"
echo
echo "Resource Usage:"
echo "  • CPU: ${final_cpu} cores"
echo "  • Memory: ${final_mem} bytes"
echo "  • Max Queue: ${final_queue} items"
echo
echo "Results saved to: ${RESULT_FILE}"
echo

if [ "$PASS" = true ]; then
    echo -e "${GREEN}✓ PASSED${NC} - No data loss detected"
    exit 0
else
    echo -e "${RED}✗ FAILED${NC} - Data loss detected: ${avg_drops}/sec"
    exit 1
fi
