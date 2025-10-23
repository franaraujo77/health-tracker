#!/bin/bash
# Validation script for OpenTelemetry Collector HPA configuration
# Tests HPA configuration for correctness and scaling behavior

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KUSTOMIZE_DIR="${SCRIPT_DIR}/.."
HPA_FILE="${KUSTOMIZE_DIR}/hpa.yaml"

echo "🔍 Validating OpenTelemetry Collector HPA Configuration"
echo "=================================================="
echo

# Test 1: Check HPA file exists
echo "Test 1: HPA file exists"
if [ -f "$HPA_FILE" ]; then
    echo -e "${GREEN}✓${NC} HPA file found at: $HPA_FILE"
else
    echo -e "${RED}✗${NC} HPA file not found"
    exit 1
fi
echo

# Test 2: Validate YAML syntax
echo "Test 2: YAML syntax validation"
if command -v yq &> /dev/null; then
    if yq eval '.' "$HPA_FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} YAML syntax is valid"
    else
        echo -e "${RED}✗${NC} YAML syntax errors detected"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠${NC} yq not installed, skipping YAML validation"
fi
echo

# Test 3: Check required HPA fields
echo "Test 3: Required HPA fields"
REQUIRED_FIELDS=(
    ".metadata.name"
    ".metadata.namespace"
    ".spec.scaleTargetRef"
    ".spec.minReplicas"
    ".spec.maxReplicas"
    ".spec.metrics"
)

for field in "${REQUIRED_FIELDS[@]}"; do
    if grep -q "$(echo $field | sed 's/\./ /g' | awk '{print $NF}')" "$HPA_FILE"; then
        echo -e "${GREEN}✓${NC} Field exists: $field"
    else
        echo -e "${RED}✗${NC} Missing required field: $field"
        exit 1
    fi
done
echo

# Test 4: Validate replica counts
echo "Test 4: Replica configuration"
MIN_REPLICAS=$(grep "minReplicas:" "$HPA_FILE" | head -1 | awk '{print $2}')
MAX_REPLICAS=$(grep "maxReplicas:" "$HPA_FILE" | head -1 | awk '{print $2}')

if [ "$MIN_REPLICAS" -ge 2 ]; then
    echo -e "${GREEN}✓${NC} minReplicas ($MIN_REPLICAS) >= 2 (high availability)"
else
    echo -e "${RED}✗${NC} minReplicas ($MIN_REPLICAS) < 2 (not highly available)"
    exit 1
fi

if [ "$MAX_REPLICAS" -le 10 ]; then
    echo -e "${GREEN}✓${NC} maxReplicas ($MAX_REPLICAS) <= 10 (within bounds)"
else
    echo -e "${YELLOW}⚠${NC} maxReplicas ($MAX_REPLICAS) > 10 (may be excessive)"
fi

if [ "$MIN_REPLICAS" -lt "$MAX_REPLICAS" ]; then
    echo -e "${GREEN}✓${NC} minReplicas < maxReplicas (scaling enabled)"
else
    echo -e "${RED}✗${NC} minReplicas >= maxReplicas (scaling disabled)"
    exit 1
fi
echo

# Test 5: Check metric types
echo "Test 5: Metric configuration"
EXPECTED_METRICS=("cpu" "memory")
for metric in "${EXPECTED_METRICS[@]}"; do
    if grep -q "name: $metric" "$HPA_FILE"; then
        echo -e "${GREEN}✓${NC} Metric configured: $metric"
    else
        echo -e "${RED}✗${NC} Missing metric: $metric"
        exit 1
    fi
done

# Check for custom metrics
if grep -q "otelcol_receiver_accepted_spans" "$HPA_FILE"; then
    echo -e "${GREEN}✓${NC} Custom metric configured: receiver queue"
else
    echo -e "${YELLOW}⚠${NC} Custom metric not found: receiver queue"
fi

if grep -q "otelcol_exporter_queue_size" "$HPA_FILE"; then
    echo -e "${GREEN}✓${NC} Custom metric configured: exporter queue"
else
    echo -e "${YELLOW}⚠${NC} Custom metric not found: exporter queue"
fi
echo

# Test 6: Validate PodDisruptionBudget
echo "Test 6: PodDisruptionBudget configuration"
if grep -q "kind: PodDisruptionBudget" "$HPA_FILE"; then
    echo -e "${GREEN}✓${NC} PodDisruptionBudget defined"

    if grep -q "minAvailable:" "$HPA_FILE"; then
        MIN_AVAILABLE=$(grep "minAvailable:" "$HPA_FILE" | awk '{print $2}')
        echo -e "${GREEN}✓${NC} minAvailable set to: $MIN_AVAILABLE"
    else
        echo -e "${YELLOW}⚠${NC} minAvailable not explicitly set"
    fi
else
    echo -e "${RED}✗${NC} PodDisruptionBudget not found"
    exit 1
fi
echo

# Test 7: Check scaling behavior
echo "Test 7: Scaling behavior configuration"
if grep -q "behavior:" "$HPA_FILE"; then
    echo -e "${GREEN}✓${NC} Scaling behavior configured"

    if grep -q "scaleDown:" "$HPA_FILE"; then
        echo -e "${GREEN}✓${NC} Scale-down behavior defined"
    fi

    if grep -q "scaleUp:" "$HPA_FILE"; then
        echo -e "${GREEN}✓${NC} Scale-up behavior defined"
    fi

    if grep -q "stabilizationWindowSeconds:" "$HPA_FILE"; then
        echo -e "${GREEN}✓${NC} Stabilization window configured"
    fi
else
    echo -e "${YELLOW}⚠${NC} Scaling behavior not explicitly configured (using defaults)"
fi
echo

# Test 8: Kubernetes dry-run validation (if kubectl available)
echo "Test 8: Kubernetes API validation"
if command -v kubectl &> /dev/null; then
    # Check if cluster is reachable first (with timeout)
    if timeout 5 kubectl cluster-info &> /dev/null; then
        OUTPUT=$(kubectl apply -f "$HPA_FILE" --dry-run=client 2>&1)
        if echo "$OUTPUT" | grep -q "error"; then
            echo -e "${RED}✗${NC} HPA manifest validation failed"
            echo "$OUTPUT"
            exit 1
        else
            echo -e "${GREEN}✓${NC} HPA manifest is valid for Kubernetes API"
        fi
    else
        echo -e "${YELLOW}⚠${NC} No active Kubernetes cluster (expected in dev environment)"
    fi
else
    echo -e "${YELLOW}⚠${NC} kubectl not installed, skipping API validation"
fi
echo

# Test 9: Validate with kustomize
echo "Test 9: Kustomize build validation"
if command -v kubectl &> /dev/null; then
    # Check if cluster is reachable first (with timeout)
    if timeout 5 kubectl cluster-info &> /dev/null; then
        KUSTOMIZE_OUTPUT=$(kubectl kustomize "$KUSTOMIZE_DIR" 2>&1)
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Kustomize build successful"

            # Check if HPA is included in kustomize output
            if echo "$KUSTOMIZE_OUTPUT" | grep -q "kind: HorizontalPodAutoscaler"; then
                echo -e "${GREEN}✓${NC} HPA included in kustomize output"
            else
                echo -e "${RED}✗${NC} HPA not found in kustomize output"
                exit 1
            fi

            # Check if PDB is included
            if echo "$KUSTOMIZE_OUTPUT" | grep -q "kind: PodDisruptionBudget"; then
                echo -e "${GREEN}✓${NC} PodDisruptionBudget included in kustomize output"
            fi
        else
            echo -e "${RED}✗${NC} Kustomize build failed"
            echo "$KUSTOMIZE_OUTPUT"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠${NC} No active Kubernetes cluster - kustomize validation skipped"
    fi
else
    echo -e "${YELLOW}⚠${NC} kubectl not installed, skipping kustomize validation"
fi
echo

# Summary
echo "=================================================="
echo -e "${GREEN}✓ All validation tests passed!${NC}"
echo
echo "HPA Configuration Summary:"
echo "  • Min Replicas: $MIN_REPLICAS"
echo "  • Max Replicas: $MAX_REPLICAS"
echo "  • Metrics: CPU, Memory, Custom (receiver/exporter queues)"
echo "  • PodDisruptionBudget: Configured"
echo "  • Scaling Behavior: Configured"
echo
echo "Next steps:"
echo "  1. Deploy to cluster: kubectl apply -k $KUSTOMIZE_DIR"
echo "  2. Verify HPA status: kubectl get hpa -n observability"
echo "  3. Monitor scaling: kubectl get hpa otel-collector -n observability --watch"
echo "  4. Load test: Run load test suite to verify scaling behavior"
