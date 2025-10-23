#!/bin/bash
set -euo pipefail

# Deploy Grafana dashboards to Kubernetes
# Usage: ./deploy-dashboards.sh [namespace]

NAMESPACE="${1:-observability}"
DASHBOARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📊 Deploying Grafana dashboards to namespace: $NAMESPACE"

# Create ConfigMap for dashboards
kubectl create configmap grafana-dashboards \
  --from-file="$DASHBOARD_DIR/executive-dashboard.json" \
  --from-file="$DASHBOARD_DIR/operations-dashboard.json" \
  --from-file="$DASHBOARD_DIR/development-dashboard.json" \
  --from-file="$DASHBOARD_DIR/cost-dashboard.json" \
  --namespace="$NAMESPACE" \
  --dry-run=client -o yaml | kubectl apply -f -

# Create ConfigMap for provisioning config
kubectl create configmap grafana-provisioning \
  --from-file="$DASHBOARD_DIR/provisioning/datasources.yml" \
  --from-file="$DASHBOARD_DIR/provisioning/dashboards.yml" \
  --namespace="$NAMESPACE" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Dashboards deployed successfully"
echo "🔗 Access Grafana at: http://grafana.$NAMESPACE.svc.cluster.local:3000"
echo ""
echo "Default dashboards:"
echo "  - Executive: /d/executive-dashboard"
echo "  - Operations: /d/operations-dashboard"
echo "  - Development: /d/development-dashboard"
echo "  - Cost: /d/cost-dashboard"
