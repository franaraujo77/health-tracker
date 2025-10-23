#!/bin/bash
# Loki Deployment Validation Script
# Validates that Loki StatefulSet is deployed correctly and accepting logs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${LOKI_NAMESPACE:-observability}"
LOKI_SERVICE="loki.${NAMESPACE}.svc.cluster.local"
TIMEOUT=300  # 5 minutes

echo -e "${YELLOW}=== Loki Deployment Validation ===${NC}\n"

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print info
info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# 1. Check if namespace exists
info "Checking namespace..."
if kubectl get namespace "$NAMESPACE" &> /dev/null; then
    success "Namespace '$NAMESPACE' exists"
else
    error "Namespace '$NAMESPACE' not found"
    exit 1
fi

# 2. Check if StatefulSet exists
info "Checking StatefulSet..."
if kubectl get statefulset loki -n "$NAMESPACE" &> /dev/null; then
    success "StatefulSet 'loki' exists"
else
    error "StatefulSet 'loki' not found"
    exit 1
fi

# 3. Wait for StatefulSet to be ready
info "Waiting for StatefulSet to be ready (timeout: ${TIMEOUT}s)..."
if kubectl wait --for=condition=ready pod -l app=loki -n "$NAMESPACE" --timeout="${TIMEOUT}s"; then
    success "StatefulSet pods are ready"
else
    error "StatefulSet pods did not become ready within timeout"
    kubectl get pods -n "$NAMESPACE" -l app=loki
    exit 1
fi

# 4. Check pod status
info "Checking pod status..."
POD_COUNT=$(kubectl get pods -n "$NAMESPACE" -l app=loki --no-headers | wc -l)
READY_COUNT=$(kubectl get pods -n "$NAMESPACE" -l app=loki --no-headers | grep "1/1" | wc -l)

if [ "$POD_COUNT" -eq "$READY_COUNT" ]; then
    success "All pods are running ($READY_COUNT/$POD_COUNT)"
else
    error "Not all pods are ready ($READY_COUNT/$POD_COUNT)"
    kubectl get pods -n "$NAMESPACE" -l app=loki
    exit 1
fi

# 5. Check PVCs
info "Checking PersistentVolumeClaims..."
PVC_COUNT=$(kubectl get pvc -n "$NAMESPACE" -l app=loki --no-headers | wc -l)
BOUND_COUNT=$(kubectl get pvc -n "$NAMESPACE" -l app=loki --no-headers | grep "Bound" | wc -l)

if [ "$PVC_COUNT" -eq "$BOUND_COUNT" ]; then
    success "All PVCs are bound ($BOUND_COUNT/$PVC_COUNT)"
else
    error "Not all PVCs are bound ($BOUND_COUNT/$PVC_COUNT)"
    kubectl get pvc -n "$NAMESPACE" -l app=loki
    exit 1
fi

# 6. Check Service
info "Checking Service..."
if kubectl get service loki -n "$NAMESPACE" &> /dev/null; then
    success "Service 'loki' exists"
    CLUSTER_IP=$(kubectl get service loki -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')
    info "Service ClusterIP: $CLUSTER_IP"
else
    error "Service 'loki' not found"
    exit 1
fi

# 7. Test Loki ready endpoint
info "Testing Loki /ready endpoint..."
POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app=loki -o jsonpath='{.items[0].metadata.name}')
if kubectl exec -n "$NAMESPACE" "$POD_NAME" -- wget -q -O- http://localhost:3100/ready | grep -q "ready"; then
    success "Loki /ready endpoint is responsive"
else
    error "Loki /ready endpoint is not responsive"
    exit 1
fi

# 8. Test Loki metrics endpoint
info "Testing Loki /metrics endpoint..."
if kubectl exec -n "$NAMESPACE" "$POD_NAME" -- wget -q -O- http://localhost:3100/metrics > /dev/null 2>&1; then
    success "Loki /metrics endpoint is responsive"
else
    error "Loki /metrics endpoint is not responsive"
    exit 1
fi

# 9. Send test log
info "Sending test log entry..."
TIMESTAMP=$(date +%s)000000000
TEST_LOG='{"streams": [{"stream": {"job": "test", "source": "validation-script"}, "values": [["'$TIMESTAMP'", "Test log entry from validation script"]]}]}'

if kubectl exec -n "$NAMESPACE" "$POD_NAME" -- wget --post-data="$TEST_LOG" -q -O- \
    --header="Content-Type: application/json" \
    http://localhost:3100/loki/api/v1/push; then
    success "Test log sent successfully"
else
    error "Failed to send test log"
    exit 1
fi

# 10. Query test log
info "Querying test log..."
sleep 5  # Wait for log to be indexed
QUERY_RESULT=$(kubectl exec -n "$NAMESPACE" "$POD_NAME" -- wget -q -O- \
    "http://localhost:3100/loki/api/v1/query?query={job=\"test\"}" 2>/dev/null || echo "")

if echo "$QUERY_RESULT" | grep -q "Test log entry"; then
    success "Test log query successful"
else
    error "Test log query failed"
    info "Query result: $QUERY_RESULT"
    exit 1
fi

# 11. Check for errors in logs
info "Checking for errors in pod logs..."
ERROR_COUNT=$(kubectl logs -n "$NAMESPACE" "$POD_NAME" --tail=100 | grep -c "error\|Error\|ERROR" || true)
if [ "$ERROR_COUNT" -lt 5 ]; then
    success "No significant errors in logs (found $ERROR_COUNT errors)"
else
    error "Found $ERROR_COUNT errors in recent logs"
    info "Recent errors:"
    kubectl logs -n "$NAMESPACE" "$POD_NAME" --tail=50 | grep "error\|Error\|ERROR" || true
fi

# Summary
echo -e "\n${GREEN}=== Validation Complete ===${NC}"
echo -e "${GREEN}✓${NC} Loki is deployed and operational"
echo -e "\nLoki endpoints:"
echo -e "  - Push API: http://${LOKI_SERVICE}:3100/loki/api/v1/push"
echo -e "  - Query API: http://${LOKI_SERVICE}:3100/loki/api/v1/query"
echo -e "  - Labels API: http://${LOKI_SERVICE}:3100/loki/api/v1/labels"
echo -e "  - Metrics: http://${LOKI_SERVICE}:3100/metrics"

exit 0
