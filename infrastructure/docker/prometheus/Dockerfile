# Custom Prometheus Docker Image for Health Tracker
# Based on official Prometheus with recording rules and backup capabilities

# Build stage - create validation and backup scripts
FROM alpine:3.19 AS builder

# Install required tools
RUN apk add --no-cache \
    bash \
    curl \
    jq \
    aws-cli

# Create backup script
RUN mkdir -p /scripts && \
    cat > /scripts/backup-prometheus.sh <<'EOF'
#!/bin/bash
# Prometheus snapshot backup script
# Creates snapshots and uploads to S3

set -e

PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
S3_BUCKET="${S3_BUCKET:-prometheus-backups}"
S3_PREFIX="${S3_PREFIX:-health-tracker}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

echo "[$(date)] Starting Prometheus backup"

# Create snapshot via API
echo "Creating snapshot..."
SNAPSHOT_RESPONSE=$(curl -s -X POST "${PROMETHEUS_URL}/api/v1/admin/tsdb/snapshot")
SNAPSHOT_NAME=$(echo "$SNAPSHOT_RESPONSE" | jq -r '.data.name')

if [ "$SNAPSHOT_NAME" = "null" ] || [ -z "$SNAPSHOT_NAME" ]; then
    echo "ERROR: Failed to create snapshot"
    echo "Response: $SNAPSHOT_RESPONSE"
    exit 1
fi

echo "Snapshot created: $SNAPSHOT_NAME"

# Compress snapshot
SNAPSHOT_PATH="/prometheus/snapshots/$SNAPSHOT_NAME"
BACKUP_FILE="/tmp/prometheus-backup-$(date +%Y%m%d-%H%M%S).tar.gz"

if [ -d "$SNAPSHOT_PATH" ]; then
    echo "Compressing snapshot..."
    tar -czf "$BACKUP_FILE" -C "$SNAPSHOT_PATH" .
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"
else
    echo "ERROR: Snapshot directory not found: $SNAPSHOT_PATH"
    exit 1
fi

# Upload to S3 if configured
if command -v aws &> /dev/null && [ -n "$AWS_ACCESS_KEY_ID" ]; then
    echo "Uploading to S3..."
    S3_KEY="${S3_PREFIX}/$(basename $BACKUP_FILE)"

    aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/${S3_KEY}" \
        --storage-class STANDARD_IA

    echo "Uploaded to s3://${S3_BUCKET}/${S3_KEY}"

    # Cleanup old backups
    echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
    CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%Y-%m-%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y-%m-%d)

    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" | while read -r line; do
        FILE_DATE=$(echo "$line" | awk '{print $1}')
        FILE_NAME=$(echo "$line" | awk '{print $4}')

        if [[ "$FILE_DATE" < "$CUTOFF_DATE" ]]; then
            echo "Deleting old backup: $FILE_NAME"
            aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${FILE_NAME}"
        fi
    done
else
    echo "S3 not configured, backup stored locally: $BACKUP_FILE"
fi

# Cleanup local snapshot
echo "Cleaning up snapshot directory..."
rm -rf "$SNAPSHOT_PATH"

echo "[$(date)] Backup completed successfully"
EOF

# Create validation script
RUN cat > /scripts/validate-config.sh <<'EOF'
#!/bin/bash
# Validate Prometheus configuration

set -e

CONFIG_FILE="${1:-/etc/prometheus/prometheus.yml}"

echo "Validating Prometheus configuration: $CONFIG_FILE"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "ERROR: Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Use promtool to validate
if command -v promtool &> /dev/null; then
    promtool check config "$CONFIG_FILE"
    echo "✓ Configuration is valid"
else
    echo "WARNING: promtool not available, skipping validation"
fi
EOF

# Make scripts executable
RUN chmod +x /scripts/*.sh

# Production stage
FROM prom/prometheus:v2.48.0

# Metadata
LABEL maintainer="Health Tracker Platform Team" \
      version="2.48.0" \
      description="Custom Prometheus with recording rules and backup capabilities"

# Copy scripts from builder
COPY --from=builder /scripts/*.sh /usr/local/bin/

# Create directories
USER root
RUN mkdir -p /etc/prometheus/rules \
             /etc/prometheus/alerts \
             /prometheus/snapshots && \
    chown -R nobody:nobody /etc/prometheus /prometheus

# Copy default configuration files
COPY prometheus.yml /etc/prometheus/prometheus.yml
COPY rules/*.yml /etc/prometheus/rules/

# Switch back to nobody user
USER nobody

# Expose ports
# 9090 - Web UI and API
EXPOSE 9090

# Volume for persistent data
VOLUME ["/prometheus"]

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:9090/-/healthy || exit 1

# Default command
CMD [ \
    "--config.file=/etc/prometheus/prometheus.yml", \
    "--storage.tsdb.path=/prometheus", \
    "--storage.tsdb.retention.time=90d", \
    "--web.console.libraries=/usr/share/prometheus/console_libraries", \
    "--web.console.templates=/usr/share/prometheus/consoles", \
    "--web.enable-lifecycle", \
    "--web.enable-admin-api", \
    "--storage.tsdb.min-block-duration=2h", \
    "--storage.tsdb.max-block-duration=2h" \
]
