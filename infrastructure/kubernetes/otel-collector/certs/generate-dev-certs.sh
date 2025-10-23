#!/bin/bash
# Generate self-signed certificates for development
# DO NOT use these certificates in production

set -e

CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAYS_VALID=365

echo "Generating self-signed TLS certificates for development..."

# Generate CA private key
openssl genrsa -out "${CERT_DIR}/ca.key" 4096

# Generate CA certificate
openssl req -new -x509 -days ${DAYS_VALID} -key "${CERT_DIR}/ca.key" \
  -out "${CERT_DIR}/ca.crt" \
  -subj "/C=US/ST=Development/L=Development/O=Health Tracker/OU=Observability/CN=Health Tracker CA"

# Generate server private key
openssl genrsa -out "${CERT_DIR}/server.key" 2048

# Generate server certificate signing request
openssl req -new -key "${CERT_DIR}/server.key" \
  -out "${CERT_DIR}/server.csr" \
  -subj "/C=US/ST=Development/L=Development/O=Health Tracker/OU=Observability/CN=otel-collector.observability.svc.cluster.local"

# Create server certificate extensions file
cat > "${CERT_DIR}/server.ext" <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = otel-collector.observability.svc.cluster.local
DNS.2 = otel-collector.observability.svc
DNS.3 = otel-collector.observability
DNS.4 = otel-collector
DNS.5 = localhost
IP.1 = 127.0.0.1
EOF

# Sign server certificate with CA
openssl x509 -req -in "${CERT_DIR}/server.csr" \
  -CA "${CERT_DIR}/ca.crt" -CAkey "${CERT_DIR}/ca.key" -CAcreateserial \
  -out "${CERT_DIR}/server.crt" -days ${DAYS_VALID} \
  -extfile "${CERT_DIR}/server.ext"

# Generate client private key
openssl genrsa -out "${CERT_DIR}/client.key" 2048

# Generate client certificate signing request
openssl req -new -key "${CERT_DIR}/client.key" \
  -out "${CERT_DIR}/client.csr" \
  -subj "/C=US/ST=Development/L=Development/O=Health Tracker/OU=Observability/CN=otel-client"

# Sign client certificate with CA
openssl x509 -req -in "${CERT_DIR}/client.csr" \
  -CA "${CERT_DIR}/ca.crt" -CAkey "${CERT_DIR}/ca.key" -CAcreateserial \
  -out "${CERT_DIR}/client.crt" -days ${DAYS_VALID}

# Clean up CSR and extension files
rm -f "${CERT_DIR}/server.csr" "${CERT_DIR}/server.ext" "${CERT_DIR}/client.csr"

echo "✓ Certificates generated successfully!"
echo ""
echo "Generated files:"
echo "  - ca.crt: Certificate Authority certificate"
echo "  - ca.key: Certificate Authority private key"
echo "  - server.crt: Server certificate"
echo "  - server.key: Server private key"
echo "  - client.crt: Client certificate"
echo "  - client.key: Client private key"
echo ""
echo "Create Kubernetes secret with:"
echo "  kubectl create secret tls otel-collector-tls \\"
echo "    --cert=server.crt \\"
echo "    --key=server.key \\"
echo "    -n observability"
echo ""
echo "WARNING: These are development certificates only!"
echo "For production, use cert-manager with Let's Encrypt or your organization's PKI."
