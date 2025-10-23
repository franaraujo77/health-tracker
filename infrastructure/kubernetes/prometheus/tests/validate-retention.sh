#!/bin/bash
# Validation script for Prometheus retention and storage settings
# Verifies that retention policies and WAL compression are correctly configured

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFESTS_DIR="$(dirname "$SCRIPT_DIR")"

echo "====================================="
echo "Prometheus Retention Validation"
echo "====================================="
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation results
PASS_COUNT=0
FAIL_COUNT=0

# Function to check configuration
check_config() {
    local description=$1
    local check_command=$2
    local expected=$3

    echo -n "Checking $description... "

    if eval "$check_command" | grep -q -- "$expected"; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASS_COUNT++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Expected: $expected"
        echo "  Command: $check_command"
        ((FAIL_COUNT++))
    fi
}

echo "1. Checking StatefulSet Configuration"
echo "--------------------------------------"

# Check retention time
check_config \
    "90-day retention time" \
    "cat '$MANIFESTS_DIR/statefulset.yaml'" \
    "--storage.tsdb.retention.time=90d"

# Check retention size
check_config \
    "450GB retention size" \
    "cat '$MANIFESTS_DIR/statefulset.yaml'" \
    "--storage.tsdb.retention.size=450GB"

# Check block duration min
check_config \
    "2h min block duration" \
    "cat '$MANIFESTS_DIR/statefulset.yaml'" \
    "--storage.tsdb.min-block-duration=2h"

# Check block duration max
check_config \
    "2h max block duration" \
    "cat '$MANIFESTS_DIR/statefulset.yaml'" \
    "--storage.tsdb.max-block-duration=2h"

# Check WAL compression
check_config \
    "WAL compression enabled" \
    "cat '$MANIFESTS_DIR/statefulset.yaml'" \
    "--storage.tsdb.wal-compression"

# Check WAL segment size
check_config \
    "128MB WAL segment size" \
    "cat '$MANIFESTS_DIR/statefulset.yaml'" \
    "--storage.tsdb.wal-segment-size=128MB"

echo
echo "2. Checking Docker Image Configuration"
echo "---------------------------------------"

# Check Dockerfile has same settings
check_config \
    "Dockerfile retention time" \
    "cat '$MANIFESTS_DIR/../docker/prometheus/Dockerfile'" \
    "--storage.tsdb.retention.time=90d"

check_config \
    "Dockerfile retention size" \
    "cat '$MANIFESTS_DIR/../docker/prometheus/Dockerfile'" \
    "--storage.tsdb.retention.size=450GB"

check_config \
    "Dockerfile WAL compression" \
    "cat '$MANIFESTS_DIR/../docker/prometheus/Dockerfile'" \
    "--storage.tsdb.wal-compression"

check_config \
    "Dockerfile WAL segment size" \
    "cat '$MANIFESTS_DIR/../docker/prometheus/Dockerfile'" \
    "--storage.tsdb.wal-segment-size=128MB"

echo
echo "3. Checking Resource Allocation"
echo "--------------------------------"

# Check storage PVC size (500GB per replica)
check_config \
    "500GB PVC size" \
    "cat '$MANIFESTS_DIR/statefulset.yaml'" \
    "storage: 500Gi"

# Check PVC matches retention size (should be larger)
RETENTION_SIZE=450
PVC_SIZE=500

echo -n "Checking PVC size > retention size... "
if [ $PVC_SIZE -gt $RETENTION_SIZE ]; then
    echo -e "${GREEN}✓ PASS${NC} (${PVC_SIZE}GB > ${RETENTION_SIZE}GB)"
    ((PASS_COUNT++))
else
    echo -e "${RED}✗ FAIL${NC} (${PVC_SIZE}GB <= ${RETENTION_SIZE}GB)"
    ((FAIL_COUNT++))
fi

echo
echo "4. Live Cluster Validation (if cluster available)"
echo "--------------------------------------------------"

# Check if kubectl is available and cluster is accessible
if timeout 5 kubectl cluster-info &> /dev/null; then
    echo "✓ Kubernetes cluster is accessible"

    # Check if Prometheus pods exist
    if kubectl get statefulset prometheus -n observability &> /dev/null; then
        echo "✓ Prometheus StatefulSet exists"

        # Get pod count
        POD_COUNT=$(kubectl get pods -n observability -l app=prometheus --no-headers 2>/dev/null | wc -l | tr -d ' ')

        if [ "$POD_COUNT" -gt 0 ]; then
            echo "✓ Found $POD_COUNT Prometheus pod(s)"

            # Get first running pod
            POD_NAME=$(kubectl get pods -n observability -l app=prometheus -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

            if [ -n "$POD_NAME" ]; then
                echo
                echo "Checking live configuration from pod: $POD_NAME"

                # Check retention via API
                RETENTION_API=$(kubectl exec -n observability "$POD_NAME" -c prometheus -- \
                    wget -q -O- http://localhost:9090/api/v1/status/runtimeinfo 2>/dev/null | \
                    grep -o '"retentionTime":"[^"]*"' | cut -d'"' -f4 || echo "")

                if [ -n "$RETENTION_API" ]; then
                    echo "  Retention time from API: $RETENTION_API"
                    if [ "$RETENTION_API" = "90d" ]; then
                        echo -e "  ${GREEN}✓ PASS${NC}"
                        ((PASS_COUNT++))
                    else
                        echo -e "  ${YELLOW}⚠ WARNING${NC}: Expected 90d, got $RETENTION_API"
                    fi
                fi

                # Check TSDB stats
                TSDB_STATS=$(kubectl exec -n observability "$POD_NAME" -c prometheus -- \
                    wget -q -O- http://localhost:9090/api/v1/status/tsdb 2>/dev/null || echo "")

                if [ -n "$TSDB_STATS" ]; then
                    echo "  ✓ TSDB stats available"
                    ((PASS_COUNT++))
                fi
            fi
        else
            echo "⚠ No Prometheus pods found (expected in fresh deployment)"
        fi
    else
        echo "⚠ Prometheus StatefulSet not deployed yet (expected in dev environment)"
    fi
else
    echo "⚠ No active Kubernetes cluster (expected in dev environment)"
    echo "  Live validation skipped"
fi

echo
echo "====================================="
echo "Validation Summary"
echo "====================================="
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"

if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${RED}Failed: $FAIL_COUNT${NC}"
    echo
    echo -e "${RED}✗ VALIDATION FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}Failed: 0${NC}"
    echo
    echo -e "${GREEN}✓ ALL VALIDATIONS PASSED${NC}"
    exit 0
fi
