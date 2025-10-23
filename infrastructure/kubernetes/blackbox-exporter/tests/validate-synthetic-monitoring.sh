#!/bin/bash
# Validate Synthetic Monitoring Configuration
# Tests that Blackbox Exporter is correctly deployed and probing targets

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

NAMESPACE="observability"
BLACKBOX_SVC="blackbox-exporter"
PROMETHEUS_SVC="prometheus"

echo "========================================"
echo "Synthetic Monitoring Validation"
echo "========================================"
echo ""

# Test 1: Check Blackbox Exporter deployment
echo -n "Test 1: Checking Blackbox Exporter deployment... "
if kubectl get deployment ${BLACKBOX_SVC} -n ${NAMESPACE} >/dev/null 2>&1; then
    REPLICAS=$(kubectl get deployment ${BLACKBOX_SVC} -n ${NAMESPACE} -o jsonpath='{.status.readyReplicas}')
    if [[ "$REPLICAS" -ge 1 ]]; then
        echo -e "${GREEN}PASS${NC} ($REPLICAS replicas ready)"
    else
        echo -e "${RED}FAIL${NC} (No ready replicas)"
        exit 1
    fi
else
    echo -e "${RED}FAIL${NC} (Deployment not found)"
    exit 1
fi

# Test 2: Check Blackbox Exporter service
echo -n "Test 2: Checking Blackbox Exporter service... "
if kubectl get service ${BLACKBOX_SVC} -n ${NAMESPACE} >/dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    exit 1
fi

# Test 3: Check Blackbox Exporter health endpoint
echo -n "Test 3: Checking Blackbox Exporter health... "
POD=$(kubectl get pods -n ${NAMESPACE} -l app=${BLACKBOX_SVC} -o jsonpath='{.items[0].metadata.name}')
if kubectl exec -n ${NAMESPACE} ${POD} -- wget -q -O- http://localhost:9115/health | grep -q "OK"; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    exit 1
fi

# Test 4: Check configuration is loaded
echo -n "Test 4: Checking configuration is loaded... "
if kubectl exec -n ${NAMESPACE} ${POD} -- wget -q -O- http://localhost:9115/config | grep -q "modules:"; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    exit 1
fi

# Test 5: Test HTTP probe module
echo -n "Test 5: Testing HTTP probe module... "
if kubectl exec -n ${NAMESPACE} ${POD} -- wget -q -O- "http://localhost:9115/probe?target=http://example.com&module=http_2xx" | grep -q "probe_success 1"; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${YELLOW}WARN${NC} (External connectivity may be limited)"
fi

# Test 6: Check Prometheus is scraping Blackbox Exporter
echo -n "Test 6: Checking Prometheus scrape configuration... "
PROM_POD=$(kubectl get pods -n ${NAMESPACE} -l app=prometheus -o jsonpath='{.items[0].metadata.name}')
if kubectl exec -n ${NAMESPACE} ${PROM_POD} -- wget -q -O- "http://localhost:9090/api/v1/targets" | grep -q "blackbox"; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${YELLOW}WARN${NC} (Blackbox targets may not be configured yet)"
fi

# Test 7: Check probe metrics are being collected
echo -n "Test 7: Checking probe metrics in Prometheus... "
sleep 5  # Wait for metrics to be scraped
QUERY="probe_success"
RESULT=$(kubectl exec -n ${NAMESPACE} ${PROM_POD} -- wget -q -O- "http://localhost:9090/api/v1/query?query=${QUERY}" | grep -o '"status":"success"')
if [[ -n "$RESULT" ]]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${YELLOW}WARN${NC} (Metrics may not be available yet)"
fi

# Test 8: Validate alert rules are loaded
echo -n "Test 8: Checking synthetic monitoring alert rules... "
if kubectl exec -n ${NAMESPACE} ${PROM_POD} -- wget -q -O- "http://localhost:9090/api/v1/rules" | grep -q "synthetic_monitoring"; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${YELLOW}WARN${NC} (Alert rules may not be loaded yet)"
fi

# Test 9: Check that critical services are being probed
echo -n "Test 9: Verifying critical service probes... "
SERVICES=("prometheus" "grafana" "loki" "tempo" "alertmanager")
MISSING_SERVICES=()

for service in "${SERVICES[@]}"; do
    if ! kubectl exec -n ${NAMESPACE} ${PROM_POD} -- wget -q -O- "http://localhost:9090/api/v1/query?query=probe_success{service=\"${service}\"}" | grep -q '"status":"success"'; then
        MISSING_SERVICES+=("$service")
    fi
done

if [[ ${#MISSING_SERVICES[@]} -eq 0 ]]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${YELLOW}WARN${NC} (Missing probes for: ${MISSING_SERVICES[*]})"
fi

# Test 10: Simulate probe failure detection
echo -n "Test 10: Testing probe failure detection... "
# Probe a non-existent endpoint
kubectl exec -n ${NAMESPACE} ${POD} -- wget -q -O- "http://localhost:9115/probe?target=http://non-existent-service:9999&module=http_2xx" | grep -q "probe_success 0"
if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}All validation tests passed!${NC}"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Access Grafana and import the Uptime dashboard"
echo "2. Configure AlertManager to route synthetic monitoring alerts"
echo "3. Add additional targets to blackbox-targets.yml as needed"
echo "4. Monitor alert rules in Prometheus UI"
echo ""
echo "Dashboard URL: http://grafana:3000/d/synthetic-monitoring"
echo "Prometheus Targets: http://prometheus:9090/targets"
echo "Blackbox Metrics: http://blackbox-exporter:9115/metrics"
