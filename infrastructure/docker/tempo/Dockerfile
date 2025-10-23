# Tempo Docker Image with S3 Support
# Base image: Grafana Tempo 2.3.1
FROM grafana/tempo:2.3.1

# Metadata
LABEL maintainer="DevSecOps Team"
LABEL description="Custom Tempo image with S3 backend and distributed tracing capabilities"
LABEL version="2.3.1"

# Install additional utilities
USER root
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tzdata \
    bash

# Create necessary directories
RUN mkdir -p /var/tempo/data \
    /var/tempo/wal \
    /var/tempo/cache

# Copy configuration files
COPY tempo-config.yaml /etc/tempo/tempo.yaml
COPY sampling-config.yaml /etc/tempo/sampling-config.yaml

# Copy health check script
COPY healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Expose ports
# 3200: HTTP API
# 4317: OTLP gRPC
# 4318: OTLP HTTP
# 9095: Tempo gRPC (internal)
# 14268: Jaeger thrift HTTP
EXPOSE 3200 4317 4318 9095 14268

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Volumes
VOLUME ["/var/tempo/data", "/var/tempo/wal"]

# Default command
ENTRYPOINT ["/tempo"]
CMD ["-config.file=/etc/tempo/tempo.yaml"]
