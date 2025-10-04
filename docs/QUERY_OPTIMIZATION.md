# Query Optimization Guide

## Overview

Best practices for optimizing database queries in the Health Tracker application using Spring Data JPA, Hibernate, and PostgreSQL.

## Common Anti-Patterns

### 1. N+1 Query Problem

**Problem:**

```java
// BAD: Triggers N+1 queries
List<User> users = userRepository.findAll();
users.forEach(user -> {
    user.getHealthProfile().getName(); // Lazy load triggers query per user!
});
```

**Solution 1: JOIN FETCH:**

```java
// GOOD: Single query with JOIN FETCH
@Query("SELECT u FROM User u LEFT JOIN FETCH u.healthProfile")
List<User> findAllWithProfiles();
```

**Solution 2: @EntityGraph:**

```java
@EntityGraph(attributePaths = {"healthProfile", "goals"})
List<User> findAll();
```

### 2. Missing Indexes

**Problem:**

```sql
-- Slow query without index
SELECT * FROM users WHERE email LIKE '%@example.com';
```

**Solution:**

```sql
-- Add index (already in V1 migration)
CREATE INDEX idx_users_email ON users(email);

-- Use index-friendly queries
SELECT * FROM users WHERE email = 'user@example.com';
```

### 3. SELECT \* Instead of Specific Columns

**Problem:**

```java
// BAD: Fetches all columns including large BLOBs
@Query("SELECT u FROM User u")
List<User> findAll();
```

**Solution:**

```java
// GOOD: Projection with only needed fields
public interface UserSummary {
    Long getId();
    String getEmail();
    String getFullName();
}

@Query("SELECT u.id as id, u.email as email, u.fullName as fullName FROM User u")
List<UserSummary> findAllSummaries();
```

### 4. Inefficient Pagination

**Problem:**

```java
// BAD: Loads all records, then slices in memory
List<User> all = userRepository.findAll();
List<User> page = all.subList(0, 20);
```

**Solution:**

```java
// GOOD: Database-level pagination
Pageable pageable = PageRequest.of(0, 20);
Page<User> users = userRepository.findAll(pageable);
```

## Optimization Strategies

### 1. Eager vs Lazy Loading

**When to use EAGER:**

- Association always needed with parent entity
- Small associated collections
- Read-heavy operations

**When to use LAZY:**

- Association rarely needed
- Large associated collections
- Write-heavy operations

**Example:**

```java
@Entity
public class User {
    @OneToOne(fetch = FetchType.EAGER)  // Always load
    private HealthProfile healthProfile;

    @OneToMany(fetch = FetchType.LAZY)  // Load on demand
    private List<HealthMetrics> metrics;
}
```

### 2. Batch Fetching

```java
@Entity
@BatchSize(size = 10)
public class HealthMetrics {
    // Hibernate will fetch metrics in batches of 10
    // instead of one query per metric
}
```

### 3. Query Result Caching

```java
@Cacheable("users")
@Query("SELECT u FROM User u WHERE u.id = :id")
Optional<User> findById(@Param("id") Long id);
```

### 4. Use @EntityGraph for Dynamic Fetching

```java
@EntityGraph(attributePaths = {"healthProfile", "goals"})
@Query("SELECT u FROM User u WHERE u.email = :email")
Optional<User> findByEmailWithAssociations(@Param("email") String email);
```

## Index Recommendations

### Current Indexes (from migrations)

```sql
-- Users table
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### When to Add Indexes

1. Columns in WHERE clauses
2. Columns in JOIN conditions
3. Columns in ORDER BY clauses
4. Foreign key columns

### When NOT to Add Indexes

1. Small tables (< 1000 rows)
2. Columns with low cardinality
3. Frequently updated columns
4. Wide VARCHAR columns

## Performance Testing

### Local Query Analysis

```sql
-- Enable query timing
SET log_min_duration_statement = 100; -- Log queries > 100ms

-- Explain query plan
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'test@example.com';
```

### Hibernate Statistics

```yaml
# application-dev.yml
spring:
  jpa:
    properties:
      hibernate:
        generate_statistics: true

logging:
  level:
    org.hibernate.stat: DEBUG
```

### pg_stat_statements

```sql
-- Find slowest queries
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- > 100ms
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Reset statistics
SELECT pg_stat_statements_reset();
```

## Monitoring and Alerts

### Grafana Dashboard

- **Access**: http://localhost:3001
- **Dashboard**: Query Performance Analysis
- **Metrics**: Query rate, execution time, N+1 indicators
- **Alerts**: Configured for queries > 100ms

### Performance Thresholds

- **Fast queries**: < 10ms
- **Acceptable**: 10-50ms
- **Slow**: 50-100ms
- **Critical**: > 100ms (investigate immediately)

## Troubleshooting

### Query Running Slowly

1. **Check indexes:**

```sql
SELECT * FROM pg_indexes WHERE tablename = 'users';
```

2. **Analyze query plan:**

```sql
EXPLAIN ANALYZE <your query>;
```

3. **Check for locks:**

```sql
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

### N+1 Query Detected

1. Enable Hibernate SQL logging (already configured in dev)
2. Count queries in logs
3. Add JOIN FETCH or @EntityGraph
4. Verify with QueryPerformanceTest

### Query Cache Not Working

1. Verify @Cacheable annotation
2. Check cache configuration in application.yml
3. Ensure entity is Serializable
4. Clear cache: `cacheManager.getCache("users").clear()`

## Best Practices Checklist

- [ ] Use JOIN FETCH for always-needed associations
- [ ] Implement pagination for list queries
- [ ] Add indexes for frequently queried columns
- [ ] Use projections for read-only queries
- [ ] Enable query caching where appropriate
- [ ] Write performance tests for critical paths (see QueryPerformanceTest)
- [ ] Monitor query performance in Grafana
- [ ] Review pg_stat_statements monthly

## Performance Testing Framework

### Query Performance Tests

Located in: `backend/src/test/java/com/healthtracker/backend/performance/QueryPerformanceTest.java`

**Test Categories:**

- N+1 query detection
- First-level cache behavior
- Query count validation
- Performance metrics documentation

**Running Tests:**

```bash
cd backend
./mvnw test -Dtest=QueryPerformanceTest
```

### Example Performance Assertion

```java
@Test
void shouldNotHaveNPlusOne() {
    statistics.clear();
    List<User> users = userRepository.findAll();
    long queryCount = statistics.getQueryExecutionCount();

    assertThat(queryCount)
        .withFailMessage("N+1 detected: %d queries for %d users",
            queryCount, users.size())
        .isLessThanOrEqualTo(2);
}
```

## Query Optimization Workflow

1. **Identify slow queries**
   - Check Grafana dashboard
   - Review application logs
   - Monitor pg_stat_statements

2. **Analyze query execution**
   - Run EXPLAIN ANALYZE
   - Check Hibernate SQL logs
   - Review query statistics

3. **Apply optimizations**
   - Add missing indexes
   - Optimize fetch strategies
   - Use projections
   - Add caching

4. **Validate improvements**
   - Run QueryPerformanceTest
   - Compare before/after metrics
   - Monitor in production

5. **Document changes**
   - Update this guide
   - Add performance tests
   - Document in PR

## Additional Resources

- [Hibernate Performance Tuning](https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html#performance)
- [PostgreSQL Query Performance](https://www.postgresql.org/docs/15/performance-tips.html)
- [Spring Data JPA Best Practices](https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html)
- Internal: `/docs/MIGRATION_TESTING.md` - Migration testing patterns
