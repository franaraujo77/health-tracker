# TLS Certificates for OpenTelemetry Collector

This directory contains scripts and configurations for TLS certificate management.

## Development Certificates

### Generate Self-Signed Certificates

For development and testing environments:

```bash
cd infrastructure/kubernetes/otel-collector/certs
chmod +x generate-dev-certs.sh
./generate-dev-certs.sh
```

This generates:
- `ca.crt` / `ca.key` - Certificate Authority
- `server.crt` / `server.key` - Server certificate for OTel Collector
- `client.crt` / `client.key` - Client certificate for testing

### Create Kubernetes Secret

```bash
kubectl create secret tls otel-collector-tls \
  --cert=server.crt \
  --key=server.key \
  -n observability

kubectl create secret generic otel-collector-ca \
  --from-file=ca.crt=ca.crt \
  -n observability
```

## Production Certificates with cert-manager

### Prerequisites

Install cert-manager in your cluster:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### ClusterIssuer

Create a ClusterIssuer for Let's Encrypt:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: devops@yourcompany.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

### Certificate Resource

cert-manager will automatically manage certificate lifecycle:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: otel-collector-tls
  namespace: observability
spec:
  secretName: otel-collector-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - otel-collector.observability.svc.cluster.local
  - otel.yourcompany.com
  duration: 2160h # 90 days
  renewBefore: 360h # 15 days
```

## Bearer Token Authentication

### Generate Authentication Token

```bash
# Generate a random bearer token
openssl rand -hex 32 > bearer-token.txt

# Create Kubernetes secret
kubectl create secret generic otel-collector-auth \
  --from-file=bearer-token=bearer-token.txt \
  -n observability
```

### Rotate Token

```bash
# Generate new token
openssl rand -hex 32 > bearer-token-new.txt

# Update secret
kubectl create secret generic otel-collector-auth-new \
  --from-file=bearer-token=bearer-token-new.txt \
  -n observability

# Update deployment to use new secret
kubectl patch deployment otel-collector -n observability \
  -p '{"spec":{"template":{"spec":{"volumes":[{"name":"auth","secret":{"secretName":"otel-collector-auth-new"}}]}}}}'

# Delete old secret after rotation period
kubectl delete secret otel-collector-auth -n observability
kubectl create secret generic otel-collector-auth \
  --from-file=bearer-token=bearer-token-new.txt \
  -n observability
```

## Testing TLS

### Test with curl

```bash
# Test HTTPS endpoint
curl --cacert ca.crt https://localhost:4318/v1/metrics

# Test with client certificate
curl --cacert ca.crt \
  --cert client.crt \
  --key client.key \
  https://localhost:4318/v1/metrics
```

### Test with OpenTelemetry SDK

```typescript
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const exporter = new OTLPTraceExporter({
  url: 'https://otel-collector.observability.svc.cluster.local:4318/v1/traces',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  },
  // For self-signed certs in development
  httpOptions: {
    rejectUnauthorized: false // Only for development!
  }
});
```

## Security Best Practices

1. **Never commit certificates or keys to version control**
2. **Use cert-manager for production** - automatic renewal, industry standards
3. **Rotate tokens regularly** - at least every 90 days
4. **Use mTLS when possible** - require client certificates
5. **Monitor certificate expiration** - set up alerts
6. **Audit access logs** - track who's sending telemetry

## Certificate Expiration Monitoring

Add Prometheus alert for certificate expiration:

```yaml
- alert: CertificateExpiringSoon
  expr: |
    probe_ssl_earliest_cert_expiry - time() < 86400 * 15
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Certificate expiring soon (< 15 days)"
```

## Troubleshooting

### Certificate not trusted

```bash
# Check certificate chain
openssl s_client -connect otel-collector:4318 -showcerts

# Verify certificate
openssl verify -CAfile ca.crt server.crt
```

### Bearer token not working

```bash
# Check secret exists
kubectl get secret otel-collector-auth -n observability

# Verify token format
kubectl get secret otel-collector-auth -n observability -o jsonpath='{.data.bearer-token}' | base64 -d
```

## References

- [cert-manager Documentation](https://cert-manager.io/docs/)
- [OpenTelemetry Security](https://opentelemetry.io/docs/collector/configuration/#security)
- [Kubernetes TLS](https://kubernetes.io/docs/tasks/tls/managing-tls-in-a-cluster/)
