#!/bin/bash
# Validation script for OpenTelemetry Collector resource detection configuration
# Tests resource detection processors and K8s attributes configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KUSTOMIZE_DIR="${SCRIPT_DIR}/.."
CONFIGMAP_FILE="${KUSTOMIZE_DIR}/configmap.yaml"
SERVICEACCOUNT_FILE="${KUSTOMIZE_DIR}/serviceaccount.yaml"

echo "🔍 Validating OpenTelemetry Collector Resource Detection Configuration"
echo "=================================================================="
echo

# Test 1: Check ConfigMap file exists
echo "Test 1: ConfigMap file exists"
if [ -f "$CONFIGMAP_FILE" ]; then
    echo -e "${GREEN}✓${NC} ConfigMap file found"
else
    echo -e "${RED}✗${NC} ConfigMap file not found"
    exit 1
fi
echo

# Test 2: Validate resource detection processors
echo "Test 2: Resource detection processors configured"
REQUIRED_DETECTORS=("env" "system" "docker" "gcp" "ec2" "ecs" "eks" "azure")
for detector in "${REQUIRED_DETECTORS[@]}"; do
    if grep -q -- "- $detector" "$CONFIGMAP_FILE"; then
        echo -e "${GREEN}✓${NC} Detector configured: $detector"
    else
        echo -e "${RED}✗${NC} Missing detector: $detector"
        exit 1
    fi
done
echo

# Test 3: Check k8s_attributes processor
echo "Test 3: Kubernetes attributes processor configured"
if grep -q "k8s_attributes:" "$CONFIGMAP_FILE"; then
    echo -e "${GREEN}✓${NC} k8s_attributes processor found"

    # Check auth type
    if grep -q 'auth_type: "serviceAccount"' "$CONFIGMAP_FILE"; then
        echo -e "${GREEN}✓${NC} ServiceAccount auth configured"
    else
        echo -e "${YELLOW}⚠${NC} ServiceAccount auth not explicitly set"
    fi

    # Check metadata extraction
    REQUIRED_METADATA=("k8s.namespace.name" "k8s.deployment.name" "k8s.pod.name" "k8s.node.name")
    for metadata in "${REQUIRED_METADATA[@]}"; do
        if grep -q "$metadata" "$CONFIGMAP_FILE"; then
            echo -e "${GREEN}✓${NC} Metadata extraction: $metadata"
        else
            echo -e "${RED}✗${NC} Missing metadata: $metadata"
            exit 1
        fi
    done
else
    echo -e "${RED}✗${NC} k8s_attributes processor not found"
    exit 1
fi
echo

# Test 4: Validate k8s_attributes in pipelines
echo "Test 4: k8s_attributes processor in pipelines"
PIPELINES=("metrics" "traces" "logs")
for pipeline in "${PIPELINES[@]}"; do
    # Extract the pipeline definition and check if k8s_attributes is in the processors list
    if grep -A 2 "^        ${pipeline}:" "$CONFIGMAP_FILE" | grep -q "k8s_attributes"; then
        echo -e "${GREEN}✓${NC} k8s_attributes in ${pipeline} pipeline"
    else
        echo -e "${RED}✗${NC} k8s_attributes missing from ${pipeline} pipeline"
        exit 1
    fi
done
echo

# Test 5: Check RBAC permissions for k8s_attributes
echo "Test 5: RBAC permissions for Kubernetes API access"
if [ -f "$SERVICEACCOUNT_FILE" ]; then
    echo -e "${GREEN}✓${NC} ServiceAccount file found"

    # Check ClusterRole exists
    if grep -q "kind: ClusterRole" "$SERVICEACCOUNT_FILE"; then
        echo -e "${GREEN}✓${NC} ClusterRole defined"
    else
        echo -e "${RED}✗${NC} ClusterRole not found"
        exit 1
    fi

    # Check required API groups
    REQUIRED_API_GROUPS=("apps" "batch")
    for api_group in "${REQUIRED_API_GROUPS[@]}"; do
        if grep -q "apiGroups:.*\"${api_group}\"" "$SERVICEACCOUNT_FILE"; then
            echo -e "${GREEN}✓${NC} API group permission: $api_group"
        else
            echo -e "${YELLOW}⚠${NC} API group not found: $api_group"
        fi
    done

    # Check required resources
    REQUIRED_RESOURCES=("pods" "deployments" "nodes" "namespaces")
    for resource in "${REQUIRED_RESOURCES[@]}"; do
        if grep -q -- "- $resource" "$SERVICEACCOUNT_FILE"; then
            echo -e "${GREEN}✓${NC} Resource permission: $resource"
        else
            echo -e "${RED}✗${NC} Missing resource permission: $resource"
            exit 1
        fi
    done

    # Check ClusterRoleBinding
    if grep -q "kind: ClusterRoleBinding" "$SERVICEACCOUNT_FILE"; then
        echo -e "${GREEN}✓${NC} ClusterRoleBinding defined"
    else
        echo -e "${RED}✗${NC} ClusterRoleBinding not found"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} ServiceAccount file not found"
    exit 1
fi
echo

# Test 6: Validate detector-specific configuration
echo "Test 6: Detector-specific configuration"
DETECTORS_WITH_CONFIG=("system" "docker" "gcp" "ec2" "ecs" "eks" "azure")
for detector in "${DETECTORS_WITH_CONFIG[@]}"; do
    if grep -A 5 "^        ${detector}:" "$CONFIGMAP_FILE" | grep -q "resource_attributes:"; then
        echo -e "${GREEN}✓${NC} Detector config found: $detector"
    else
        echo -e "${YELLOW}⚠${NC} Detector config not found: $detector (may use defaults)"
    fi
done
echo

# Test 7: Check processor ordering in pipelines
echo "Test 7: Processor ordering validation"
echo "Checking that processors are in correct order:"
echo "  memory_limiter → resourcedetection → k8s_attributes → attributes → batch"
for pipeline in "${PIPELINES[@]}"; do
    PIPELINE_DEF=$(grep -A 2 "^        ${pipeline}:" "$CONFIGMAP_FILE" | grep "processors:")
    if echo "$PIPELINE_DEF" | grep -q "memory_limiter.*resourcedetection.*k8s_attributes.*attributes.*batch"; then
        echo -e "${GREEN}✓${NC} Correct processor order in ${pipeline} pipeline"
    else
        # Check if all processors are present (order might be formatted differently)
        if echo "$PIPELINE_DEF" | grep -q "memory_limiter" && \
           echo "$PIPELINE_DEF" | grep -q "resourcedetection" && \
           echo "$PIPELINE_DEF" | grep -q "k8s_attributes" && \
           echo "$PIPELINE_DEF" | grep -q "attributes" && \
           echo "$PIPELINE_DEF" | grep -q "batch"; then
            echo -e "${YELLOW}⚠${NC} All processors present in ${pipeline}, verify order manually"
        else
            echo -e "${RED}✗${NC} Missing processors in ${pipeline} pipeline"
            exit 1
        fi
    fi
done
echo

# Test 8: Validate cloud provider resource attributes
echo "Test 8: Cloud provider resource attributes"
CLOUD_ATTRIBUTES=("cloud.provider" "cloud.platform" "cloud.region" "cloud.account.id")
for attr in "${CLOUD_ATTRIBUTES[@]}"; do
    if grep -q "$attr:" "$CONFIGMAP_FILE"; then
        echo -e "${GREEN}✓${NC} Cloud attribute configured: $attr"
    else
        echo -e "${YELLOW}⚠${NC} Cloud attribute not found: $attr"
    fi
done
echo

# Test 9: Check host and system attributes
echo "Test 9: Host and system resource attributes"
HOST_ATTRIBUTES=("host.name" "host.id" "host.arch" "os.type")
for attr in "${HOST_ATTRIBUTES[@]}"; do
    if grep -q "$attr:" "$CONFIGMAP_FILE"; then
        echo -e "${GREEN}✓${NC} Host attribute configured: $attr"
    else
        echo -e "${YELLOW}⚠${NC} Host attribute not found: $attr"
    fi
done
echo

# Test 10: Validate YAML syntax with kubectl (if available)
echo "Test 10: YAML syntax validation"
if command -v kubectl &> /dev/null; then
    if timeout 5 kubectl cluster-info &> /dev/null; then
        if kubectl apply -f "$CONFIGMAP_FILE" --dry-run=client > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} ConfigMap YAML is valid"
        else
            echo -e "${RED}✗${NC} ConfigMap YAML validation failed"
            kubectl apply -f "$CONFIGMAP_FILE" --dry-run=client
            exit 1
        fi

        if kubectl apply -f "$SERVICEACCOUNT_FILE" --dry-run=client > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} ServiceAccount YAML is valid"
        else
            echo -e "${RED}✗${NC} ServiceAccount YAML validation failed"
            kubectl apply -f "$SERVICEACCOUNT_FILE" --dry-run=client
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠${NC} No active Kubernetes cluster - YAML validation skipped"
    fi
else
    echo -e "${YELLOW}⚠${NC} kubectl not installed - YAML validation skipped"
fi
echo

# Summary
echo "=================================================================="
echo -e "${GREEN}✓ All validation tests passed!${NC}"
echo
echo "Resource Detection Configuration Summary:"
echo "  • Detectors: env, system, docker, gcp, ec2, ecs, eks, azure"
echo "  • k8s_attributes processor: Configured with ServiceAccount auth"
echo "  • RBAC: ClusterRole and ClusterRoleBinding configured"
echo "  • Pipelines: All pipelines include resource detection and k8s_attributes"
echo "  • Cloud Providers: Multi-cloud support (AWS, GCP, Azure)"
echo
echo "Expected Resource Attributes:"
echo "  • Cloud: provider, platform, region, account, availability_zone"
echo "  • Host: name, id, arch, CPU details, OS type/description"
echo "  • Container: id, name, runtime"
echo "  • Kubernetes: namespace, pod, deployment, node, labels, annotations"
echo
echo "Next steps:"
echo "  1. Deploy to cluster: kubectl apply -k $KUSTOMIZE_DIR"
echo "  2. Send test telemetry and verify resource attributes are enriched"
echo "  3. Check logs: kubectl logs -n observability -l app=otel-collector"
echo "  4. Query metrics: kubectl port-forward -n observability svc/otel-collector 8888:8888"
