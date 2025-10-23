# Loki Docker Image

Custom Grafana Loki image with S3 backend support and enhanced logging capabilities for the Health Tracker CI/CD pipeline.

## Features

- **Base Image**: Grafana Loki 2.9.4
- **Storage Backend**: S3-compatible object storage
- **Retention Policy**: 30 days (configurable)
- **Custom Parsers**: GitHub Actions and JSON log formats
- **Health Checks**: Automated ready and metrics endpoint validation
- **Security**: Multi-tenancy support, TLS ready

## Build

```bash
docker build -t health-tracker/loki:2.9.4 .
```

## Run Locally

```bash
docker run -d \
  --name loki \
  -p 3100:3100 \
  -v $(pwd)/data:/loki/data \
  -e AWS_ACCESS_KEY_ID=your_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret \
  health-tracker/loki:2.9.4
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key for S3 | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for S3 | - |
| `AWS_REGION` | AWS region for S3 bucket | `us-east-1` |
| `LOKI_S3_BUCKET` | S3 bucket name | `loki-logs-dev` |

### Ports

| Port | Protocol | Description |
|------|----------|-------------|
| 3100 | HTTP | API and UI endpoint |
| 9095 | gRPC | Distributor endpoint |
| 7946 | TCP | Memberlist (clustering) |

## Health Check

The image includes a built-in health check that validates:
- Ready endpoint (`/ready`)
- Metrics endpoint (`/metrics`)

Manual health check:
```bash
docker exec loki /usr/local/bin/healthcheck.sh
```

## Custom Parsers

### GitHub Actions Parser
Located at `/etc/loki/parsers/github-actions.yaml`, this parser extracts:
- Timestamp
- Log level
- Workflow name
- Job and step names
- Trace IDs for correlation
- Error and warning patterns

### JSON Parser
Located at `/etc/loki/parsers/json.yaml`, supports structured JSON logs with:
- Standard field extraction (level, message, timestamp)
- Trace correlation (trace_id, span_id)
- Label extraction for efficient querying
- Metrics extraction from log data

## Validation

Test the Loki image:

```bash
# 1. Build the image
docker build -t health-tracker/loki:2.9.4 .

# 2. Run the container
docker run -d --name loki-test -p 3100:3100 health-tracker/loki:2.9.4

# 3. Check health
curl http://localhost:3100/ready

# 4. Send test log
curl -H "Content-Type: application/json" \
  -XPOST -s "http://localhost:3100/loki/api/v1/push" \
  --data-raw '{"streams": [{"stream": {"job": "test"}, "values": [["'"$(date +%s)000000000"'", "test log message"]]}]}'

# 5. Query logs
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={job="test"}'

# 6. Cleanup
docker stop loki-test && docker rm loki-test
```

## S3 Backend Setup

For production, ensure S3 bucket exists with:
- Versioning enabled
- Encryption at rest (SSE-S3 or SSE-KMS)
- Lifecycle policies for cost optimization
- Proper IAM permissions for Loki pods

## Troubleshooting

### Logs not appearing
- Check ingestion limits in `loki-config.yaml`
- Verify S3 credentials and bucket access
- Review Loki logs: `docker logs loki`

### High memory usage
- Adjust WAL replay ceiling
- Reduce chunk retention period
- Tune query result cache size

### Slow queries
- Check label cardinality
- Optimize LogQL queries (use label selectors)
- Review query parallelism settings

## References

- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Storage Configuration](https://grafana.com/docs/loki/latest/storage/)
