# Loki Docker Image with S3 Support
# Base image: Grafana Loki 2.9.4
FROM grafana/loki:2.9.4

# Metadata
LABEL maintainer="DevSecOps Team"
LABEL description="Custom Loki image with S3 plugin and enhanced logging capabilities"
LABEL version="2.9.4"

# Install additional utilities for debugging and validation
USER root
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tzdata \
    bash

# Create necessary directories with proper permissions
RUN mkdir -p /loki/data \
    /loki/wal \
    /loki/cache \
    /loki/rules \
    && chown -R loki:loki /loki

# Copy custom configuration and parsers
COPY loki-config.yaml /etc/loki/local-config.yaml
COPY parsers/ /etc/loki/parsers/

# Health check script
COPY healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Switch back to loki user
USER loki

# Expose ports
# 3100: HTTP API and UI
# 9095: gRPC (for distributor)
# 7946: Memberlist (for clustering)
EXPOSE 3100 9095 7946

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Volume for persistent data
VOLUME ["/loki/data", "/loki/wal"]

# Default command
ENTRYPOINT ["/usr/bin/loki"]
CMD ["-config.file=/etc/loki/local-config.yaml"]
