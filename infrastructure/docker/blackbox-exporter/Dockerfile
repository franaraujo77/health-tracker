# Prometheus Blackbox Exporter for Synthetic Monitoring
# Version: 0.24.0

FROM prom/blackbox-exporter:v0.24.0

# Add custom configuration
COPY blackbox.yml /etc/blackbox_exporter/config.yml

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:9115/health || exit 1

# Expose metrics port
EXPOSE 9115

# Run with custom config
ENTRYPOINT ["/bin/blackbox_exporter"]
CMD ["--config.file=/etc/blackbox_exporter/config.yml"]
