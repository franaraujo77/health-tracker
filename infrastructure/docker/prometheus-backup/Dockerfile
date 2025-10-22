# Prometheus Backup Container
# Creates snapshots and uploads to S3 with retention management
FROM alpine:3.19

# Install required packages
RUN apk add --no-cache \
    bash \
    curl \
    aws-cli \
    jq \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Copy backup script
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Create non-root user
RUN addgroup -g 65534 nobody && \
    adduser -D -u 65534 -G nobody -s /bin/sh nobody

# Switch to non-root user
USER nobody

# Set working directory
WORKDIR /tmp

# Run backup script
ENTRYPOINT ["/usr/local/bin/backup.sh"]
