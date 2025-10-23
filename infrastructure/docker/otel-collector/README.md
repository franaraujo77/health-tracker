# OpenTelemetry Collector Docker Image

This directory contains the Dockerfile for the OpenTelemetry Collector used in the Health Tracker CI/CD pipeline observability infrastructure.

## Overview

The OpenTelemetry Collector is the central telemetry ingestion point that receives, processes, and exports metrics, logs, and traces from GitHub Actions workflows and application components.

## Features

- **Base Image**: `otel/opentelemetry-collector-contrib:0.96.0`
- **Multi-stage Build**: Optimized image size with separate validator builder stage
- **Health Checks**: Built-in HTTP health endpoint on port 13133
- **Config Validation**: Custom YAML validation script to catch misconfigurations
- **Security**: Runs as non-root user (nobody)
- **Debugging**: zpages extension enabled on port 55679

## Exposed Ports

| Port  | Protocol | Purpose                          |
|-------|----------|----------------------------------|
| 4317  | gRPC     | OTLP receiver (gRPC)             |
| 4318  | HTTP     | OTLP receiver (HTTP)             |
| 8888  | HTTP     | Prometheus metrics endpoint      |
| 13133 | HTTP     | Health check endpoint            |
| 55679 | HTTP     | zpages debugging extension       |

## Building the Image

```bash
# Build the image
docker build -t health-tracker/otel-collector:0.96.0 .

# Build with custom tag
docker build -t health-tracker/otel-collector:latest .
```

## Running the Container

### With Default Configuration

```bash
docker run -d \
  --name otel-collector \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 8888:8888 \
  -p 13133:13133 \
  -v $(pwd)/config.yaml:/etc/otelcol/config.yaml \
  health-tracker/otel-collector:0.96.0
```

### With Custom Configuration

```bash
docker run -d \
  --name otel-collector \
  -p 4317:4317 \
  -p 4318:4318 \
  -v /path/to/custom-config.yaml:/etc/otelcol/config.yaml \
  health-tracker/otel-collector:0.96.0 \
  --config=/etc/otelcol/config.yaml
```

## Configuration Validation

The image includes a built-in configuration validator script:

```bash
# Validate configuration before running
docker run --rm \
  -v $(pwd)/config.yaml:/etc/otelcol/config.yaml \
  health-tracker/otel-collector:0.96.0 \
  /usr/local/bin/validate-config.sh /etc/otelcol/config.yaml
```

The validator checks:
- YAML syntax validity
- Required sections (receivers, processors, exporters, service)
- Service pipelines configuration

## Health Checks

The container includes a built-in health check that runs every 30 seconds:

```bash
# Check container health status
docker inspect --format='{{json .State.Health}}' otel-collector

# Manual health check
curl http://localhost:13133/
```

## Debugging

Access the zpages extension for debugging:

```bash
# Open in browser
open http://localhost:55679/debug/pipelinez
```

Available zpages endpoints:
- `/debug/servicez` - Service status
- `/debug/pipelinez` - Pipeline status
- `/debug/extensionz` - Extension status
- `/debug/tracez` - Trace debugging

## Security

- Container runs as non-root user (`nobody:nobody`)
- Minimal attack surface with Alpine base
- No shell access required for operation
- Configuration validation prevents injection attacks

## Next Steps

1. Create base collector configuration (`otel-collector-config.yaml`)
2. Create Kubernetes deployment manifests
3. Configure TLS and authentication
4. Set up exporters for Prometheus, Loki, and Tempo

## References

- [OpenTelemetry Collector Documentation](https://opentelemetry.io/docs/collector/)
- [Collector Configuration Reference](https://opentelemetry.io/docs/collector/configuration/)
- [Contrib Receivers/Processors/Exporters](https://github.com/open-telemetry/opentelemetry-collector-contrib)
