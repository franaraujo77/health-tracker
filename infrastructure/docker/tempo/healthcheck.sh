#!/bin/bash
# Tempo Health Check Script

set -e

# Configuration
TEMPO_URL="${TEMPO_URL:-http://localhost:3200}"
TIMEOUT=5

# Check if Tempo is ready
check_ready() {
    curl -f -s -m "$TIMEOUT" "${TEMPO_URL}/ready" > /dev/null 2>&1
    return $?
}

# Check metrics endpoint
check_metrics() {
    curl -f -s -m "$TIMEOUT" "${TEMPO_URL}/metrics" > /dev/null 2>&1
    return $?
}

# Main health check
main() {
    if ! check_ready; then
        echo "ERROR: Tempo ready check failed"
        exit 1
    fi

    if ! check_metrics; then
        echo "ERROR: Tempo metrics endpoint failed"
        exit 1
    fi

    echo "OK: Tempo is healthy"
    exit 0
}

main
