# Grafana Dashboard Backup Container
# Exports dashboards via API and commits to Git repository
FROM alpine:3.19

# Install required packages
RUN apk add --no-cache \
    bash \
    curl \
    git \
    jq \
    openssh-client \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Copy backup script
COPY backup-dashboards.sh /usr/local/bin/backup-dashboards.sh
RUN chmod +x /usr/local/bin/backup-dashboards.sh

# Create non-root user
RUN addgroup -g 65534 nobody && \
    adduser -D -u 65534 -G nobody -s /bin/sh nobody

# Create directories for git operations
RUN mkdir -p /workspace && chown nobody:nobody /workspace

# Switch to non-root user
USER nobody

# Set working directory
WORKDIR /workspace

# Run backup script
ENTRYPOINT ["/usr/local/bin/backup-dashboards.sh"]
