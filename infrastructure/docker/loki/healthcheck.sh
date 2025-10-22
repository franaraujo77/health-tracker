#!/bin/bash
# Loki Health Check Script
# Validates that Loki is ready to accept requests

set -e

# Configuration
LOKI_URL="${LOKI_URL:-http://localhost:3100}"
TIMEOUT=5

# Function to check if Loki is ready
check_ready() {
    curl -f -s -m "$TIMEOUT" "${LOKI_URL}/ready" > /dev/null 2>&1
    return $?
}

# Function to check metrics endpoint
check_metrics() {
    curl -f -s -m "$TIMEOUT" "${LOKI_URL}/metrics" > /dev/null 2>&1
    return $?
}

# Main health check logic
main() {
    # Check if Loki ready endpoint responds
    if ! check_ready; then
        echo "ERROR: Loki ready check failed"
        exit 1
    fi

    # Check if metrics endpoint is accessible
    if ! check_metrics; then
        echo "ERROR: Loki metrics endpoint failed"
        exit 1
    fi

    echo "OK: Loki is healthy"
    exit 0
}

# Run health check
main
