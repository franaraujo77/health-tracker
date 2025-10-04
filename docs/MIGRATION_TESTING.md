# Migration Testing Framework

## Overview

The Health Tracker backend implements an automated migration testing framework using Testcontainers and JUnit 5. This framework validates all aspects of database migrations including correctness, idempotency, performance, and schema integrity.

## Test Categories

### 1. Basic Migration Validation

Tests that verify migrations apply successfully and checksums are valid.

- `shouldApplyAllMigrationsSuccessfully` - Verifies all 7 migrations apply
- `shouldValidateMigrationChecksums` - Validates checksums match expected values

### 2. Idempotency Validation

Tests that ensure migrations can be safely re-applied without side effects.

- `shouldValidateMigrationIdempotency` - Verifies migrations are no-op on second run
- `shouldHandleRepeatedMigrationAttempts` - Tests multiple successive migration attempts

### 3. Performance Benchmarks

Tests that establish baseline metrics for migration performance.

- `shouldBenchmarkMigrationPerformance` - Measures total migration time
- `shouldBenchmarkIndividualMigrations` - Profiles each migration individually

**Current Baselines** (7 migrations, PostgreSQL 15-alpine):

- Total migration time: ~33ms
- Average per migration: ~4.7ms
- Max individual migration: <2000ms threshold

### 4. Metadata Validation

Tests that verify migration metadata integrity.

- `shouldValidateMigrationVersionNumbers` - Ensures sequential version numbering
- `shouldValidateMigrationNamingConvention` - Validates naming follows pattern `V{version}__{description}.sql`
- `shouldVerifyNoMissingMigrations` - Checks for gaps in migration sequence
- `shouldValidateMigrationTypes` - Confirms all migrations are SQL (not Java-based)

### 5. Schema State Validation

Tests that validate the database schema matches expectations.

- `shouldValidateExpectedTablesExist` - Verifies all tables created
- `shouldValidateTableColumns` - Checks column names and types
- `shouldValidateIndexesExist` - Validates indexes are created
- `shouldValidateConstraints` - Confirms primary keys and unique constraints

## Running Tests Locally

### Prerequisites

- Java 21 installed
- Docker running (for Testcontainers)

### Execute All Migration Tests

```bash
cd backend
./mvnw test -Dtest=MigrationTest
```

### Execute Specific Test

```bash
./mvnw test -Dtest=MigrationTest#shouldValidateMigrationIdempotency
```

### Container Reuse Mode

For faster local iteration, Testcontainers reuse is enabled by default via `testcontainers.properties`. The PostgreSQL container persists between test runs.

To disable reuse for a specific run:

```bash
./mvnw test -Dtest=MigrationTest -Dtestcontainers.reuse.enable=false
```

## CI/CD Integration

Migration tests run automatically in GitHub Actions via the `migration-tests` job in `.github/workflows/backend-ci.yml`.

### Job Configuration

- Runs on: `ubuntu-latest`
- PostgreSQL: Spun up by Testcontainers (no service dependency)
- Container reuse: Disabled in CI with `-Dtestcontainers.reuse.enable=false`
- Test results: Published via `EnricoMi/publish-unit-test-result-action@v2`

### Triggering CI Tests

Migration tests run automatically on:

- Push to `main` or `develop` branches (when backend files change)
- Pull requests targeting `main` or `develop` (when backend files change)

### Viewing Results

Test results appear in:

1. GitHub Actions summary page
2. PR checks (if triggered by PR)
3. Downloadable Surefire reports artifact

## Rollback Testing Limitations

**Important**: Flyway Community Edition does not support migration rollback (undo migrations). The current test suite validates:

- Forward migration correctness
- Idempotency (re-applying migrations)
- Schema state after migrations

What is **not** tested:

- Rolling back migrations (requires Flyway Teams/Enterprise)
- Data migration rollback scenarios

For production rollback scenarios, follow the manual rollback procedures in the Flyway Migration Guide.

## Troubleshooting

### Docker Not Running

**Error**: `Could not find a valid Docker environment`
**Solution**: Start Docker Desktop or Docker daemon before running tests

### Container Port Conflicts

**Error**: `Bind for 0.0.0.0:5432 failed: port is already allocated`
**Solution**:

- Stop local PostgreSQL instance
- Or kill the reused Testcontainers instance: `docker ps` → `docker kill <container_id>`

### Checksum Validation Failures

**Error**: `Migration checksum mismatch`
**Solution**:

- Verify migration file hasn't been modified after initial application
- If intentional change, update migration version number (create new migration)
- Never modify applied migrations

### Test Timeout Issues

**Error**: Tests hang or timeout
**Solution**:

- Verify Docker has sufficient resources (4GB+ RAM recommended)
- Check Docker logs: `docker logs <container_id>`
- Disable container reuse: `-Dtestcontainers.reuse.enable=false`

### Java Version Mismatch

**Error**: `class file has wrong version`
**Solution**: Ensure Java 21 is active

```bash
java -version  # Should show Java 21
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

## Best Practices

1. **Run tests before committing** - Catch migration issues early
2. **Monitor performance baselines** - Alert on significant regression
3. **Update schema validation tests** - When adding new tables/columns
4. **Clean database in tests** - Use `flyway.clean()` for isolation
5. **Document complex migrations** - Add comments explaining non-obvious logic

## Performance Monitoring

Track these metrics over time to detect regressions:

- Total migration execution time
- Individual migration execution time
- Database schema complexity (table count, index count)

Alert thresholds:

- Total time exceeds 5 seconds
- Any single migration exceeds 2 seconds
- Idempotency test failures
