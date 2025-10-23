# LogQL Query Performance Optimization Guide

## Query Performance Principles

### 1. Always Use Label Selectors
**Bad:**
```logql
{} |= "error"
```

**Good:**
```logql
{job="github-actions"} |= "error"
```

### 2. Limit Time Ranges
**Bad:**
```logql
{job="github-actions"}[30d]  # 30 days
```

**Good:**
```logql
{job="github-actions"}[1h]   # 1 hour
```

### 3. Use Specific Filters Early
```logql
{job="github-actions", workflow="frontend-ci"} |= "error"
```

### 4. Avoid High-Cardinality Labels
```logql
# Don't use user_id, request_id, etc. as labels
# Use them in log body instead
```

## Performance Benchmarks

| Query Type | Target Time | Notes |
|------------|-------------|-------|
| 1 hour range | < 2s | With label selectors |
| 24 hour range | < 5s | With aggregations |
| 7 day range | < 10s | With caching |

## Query Examples

### Fast Queries
```logql
# Recent errors (1h)
{job="github-actions"} |= "error" | json | level="error"

# Workflow status
count_over_time({workflow="frontend-ci"}[5m])

# Error rate
sum(rate({job="github-actions"} |= "error" [5m])) /
sum(rate({job="github-actions"} [5m]))
```

### Optimized Aggregations
```logql
# Top 10 error messages
topk(10,
  count by (message) (
    {job="github-actions"} |= "error" | json
  )
)
```

## References
- [LogQL Documentation](https://grafana.com/docs/loki/latest/logql/)
- [Query Performance](https://grafana.com/docs/loki/latest/logql/query_performance/)
