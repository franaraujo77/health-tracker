# Tempo Docker Image

Custom Grafana Tempo image for distributed tracing in the Health Tracker CI/CD pipeline.

## Features

- **Base Image**: Grafana Tempo 2.3.1
- **Storage**: S3-compatible backend
- **Retention**: 7 days
- **Sampling**: Intelligent tail-based sampling (10% + always sample errors/slow)
- **Protocols**: OTLP (gRPC/HTTP), Jaeger

## Build

```bash
docker build -t health-tracker/tempo:2.3.1 .
```

## Run

```bash
docker run -d \
  --name tempo \
  -p 3200:3200 \
  -p 4317:4317 \
  -p 4318:4318 \
  -e AWS_ACCESS_KEY_ID=your_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret \
  health-tracker/tempo:2.3.1
```

## Ports

| Port | Protocol | Description |
|------|----------|-------------|
| 3200 | HTTP | API and query endpoint |
| 4317 | gRPC | OTLP gRPC receiver |
| 4318 | HTTP | OTLP HTTP receiver |
| 9095 | gRPC | Tempo internal gRPC |
| 14268 | HTTP | Jaeger thrift HTTP |
| 7946 | TCP | Memberlist |

## Configuration

### Environment Variables

- `AWS_ACCESS_KEY_ID` - S3 access key
- `AWS_SECRET_ACCESS_KEY` - S3 secret key
- `AWS_REGION` - AWS region (default: us-east-1)

### Sampling Strategy

- **Always sample**: Errors, slow requests (>5s), critical workflows
- **Probabilistic**: 10% of remaining traces
- **Configurable**: Edit `sampling-config.yaml`

## Validation

```bash
# Check health
curl http://localhost:3200/ready

# Send test trace
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[...]}'

# Query trace
curl http://localhost:3200/api/traces/<trace-id>
```

## References

- [Tempo Documentation](https://grafana.com/docs/tempo/latest/)
- [OTLP Specification](https://opentelemetry.io/docs/reference/specification/protocol/otlp/)
