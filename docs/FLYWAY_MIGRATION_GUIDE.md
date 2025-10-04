# Flyway Migration Guide

## Overview

This guide documents the Flyway database migration standards and CI/CD validation process for the Health Tracker application.

## Migration Naming Convention

### Format

```
V{version}__{description}.sql
```

### Examples

```sql
V1__create_users_table.sql
V2__create_health_profiles_table.sql
V8__add_user_preferences_table.sql
```

### Rules

- **Version must be unique and sequential** - Use integers (V1, V2, V3...)
- **Double underscore separator** - Required between version and description
- **Description in snake_case** - Words separated by underscores
- **.sql extension required** - All migrations must be SQL files
- **Never modify applied migrations** - This will cause checksum mismatches

## Migration Writing Guidelines

### 1. Always Use Transactions

```sql
-- V8__add_user_preferences.sql
BEGIN;

CREATE TABLE user_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

COMMIT;
```

### 2. Include Rollback Instructions in Comments

```sql
-- V8__add_user_preferences.sql

-- ROLLBACK INSTRUCTIONS:
-- To undo this migration manually, execute:
-- DROP TABLE IF EXISTS user_preferences CASCADE;

CREATE TABLE user_preferences (
    ...
);
```

### 3. Avoid Data Manipulation in Schema Migrations

**❌ BAD:**

```sql
-- Don't mix schema and data changes
CREATE TABLE settings (...);
INSERT INTO settings VALUES (...);  -- Avoid this
```

**✅ GOOD:**

```sql
-- Schema migration
CREATE TABLE settings (...);

-- Separate data migration if needed: V8_1__seed_default_settings.sql
```

### 4. Test Migrations Locally Before Committing

```bash
# Apply migrations locally
cd backend
./mvnw flyway:migrate

# Validate migrations
./mvnw flyway:validate

# Check migration status
./mvnw flyway:info
```

## Checksum Handling

### Never Modify Applied Migrations

Once a migration has been applied to ANY environment (dev, staging, production), **never modify it**.

**Why?** Flyway calculates a checksum for each migration. Changing the file changes the checksum, causing validation failures.

**If you need to make changes:**

1. Create a NEW migration with the changes
2. Document why in the migration file comments

### Using `flyway:repair`

**Only use in these scenarios:**

- Fixing failed migration metadata
- Removing failed migration entries
- Realigning checksums after a hotfix (emergency only)

```bash
# Repair Flyway metadata
./mvnw flyway:repair
```

**⚠️ Warning:** This is a manual operation. Never use in automated scripts.

## CI/CD Validation Process

### Automatic Validation

Every pull request triggers the `migration-validation` job that:

1. **Spins up temporary PostgreSQL** - Fresh database instance
2. **Runs `flyway:info`** - Displays all migrations and their status
3. **Runs `flyway:validate`** - Validates checksums and order
4. **Blocks PR merge** - If validation fails

### What Causes Validation Failures?

1. **Checksum mismatch** - Modified an existing migration
2. **Out-of-order migrations** - Version numbers not sequential
3. **Invalid naming** - Doesn't follow V{version}\_\_{description}.sql format
4. **Missing migrations** - Gap in version sequence
5. **SQL syntax errors** - Migration script has invalid SQL

### Viewing Validation Results

Check the GitHub Actions summary for detailed migration status:

```
🗃️ Database Migration Validation

Migration Status
+---------+--------------------------+----------+---------------------+
| Version | Description              | Installed| State               |
+---------+--------------------------+----------+---------------------+
| 1       | create users table       | ✓        | Success             |
| 2       | create health profiles   | ✓        | Success             |
| 3       | create health metrics    | ✓        | Success             |
| 4       | create goals table       | ✓        | Success             |
| 5       | create indexes           | ✓        | Success             |
| 6       | create audit logs        | ✓        | Success             |
| 7       | create token blacklist   | ✓        | Success             |
+---------+--------------------------+----------+---------------------+

✅ All migrations validated successfully
```

## Local Development

### Environment Variables

Set these for local Flyway commands:

```bash
export FLYWAY_URL=jdbc:postgresql://localhost:5432/healthtracker
export FLYWAY_USER=healthtracker
export FLYWAY_PASSWORD=your_password
```

Or use Docker Compose defaults:

```bash
export FLYWAY_URL=jdbc:postgresql://localhost:5432/healthtracker
export FLYWAY_USER=healthtracker
export FLYWAY_PASSWORD=healthtracker
```

### Common Flyway Commands

#### Apply All Pending Migrations

```bash
./mvnw flyway:migrate
```

#### Validate Migration Integrity

```bash
./mvnw flyway:validate
```

#### Check Migration Status

```bash
./mvnw flyway:info
```

#### Repair Metadata (Emergency Only)

```bash
./mvnw flyway:repair
```

#### Clean Database (Development Only)

```bash
# ⚠️ DESTRUCTIVE! Drops all objects in the database
# Only use in local development, NEVER in production
./mvnw flyway:clean

# Note: Clean is DISABLED in our Maven configuration for safety
# To enable temporarily, remove <cleanDisabled>true</cleanDisabled> from pom.xml
```

## Migration Best Practices

### ✅ DO

- Use descriptive migration names
- Include rollback instructions in comments
- Test migrations locally before pushing
- Keep migrations small and focused
- Use transactions for atomic changes
- Add indexes for foreign keys
- Document complex migrations

### ❌ DON'T

- Modify applied migrations
- Mix schema and data changes
- Use database-specific features without comments
- Create migrations with long-running operations without planning
- Skip local testing
- Use `flyway:clean` outside development

## Troubleshooting

### "Checksum mismatch" Error

**Problem:** Modified an existing migration file

**Solution:**

```bash
# Option 1: Revert your changes to the migration file
git checkout HEAD -- backend/src/main/resources/db/migration/V7__*.sql

# Option 2: Create a new migration instead
# Create V8__fix_previous_migration.sql with corrective changes
```

### "Detected resolved migration not applied" Error

**Problem:** Migration file exists but wasn't applied to your database

**Solution:**

```bash
# Apply pending migrations
./mvnw flyway:migrate
```

### "Validate failed: Migrations have failed validation"

**Problem:** Migration order or naming issue

**Solution:**

```bash
# Check migration status
./mvnw flyway:info

# Look for:
# - Gaps in version numbers
# - Failed migrations
# - Out-of-order migrations
```

### CI Pipeline Failure

**Problem:** Migration validation failed in GitHub Actions

**Solution:**

1. Check the GitHub Actions summary for specific error
2. Run `./mvnw flyway:validate` locally to reproduce
3. Fix the issue based on the error message
4. Push the fix and verify CI passes

## Integration with Application

### Automatic Migration on Startup

Spring Boot automatically runs Flyway migrations on application startup when configured in `application.yml`:

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
    baseline-version: 0
```

### Migration Locations

All migration files must be placed in:

```
backend/src/main/resources/db/migration/
```

**Current migrations (V1-V7):**

- V1\_\_create_users_table.sql
- V2\_\_create_health_profiles_table.sql
- V3\_\_create_health_metrics_table.sql
- V4\_\_create_goals_table.sql
- V5\_\_create_indexes.sql
- V6\_\_create_audit_logs_table.sql
- V7\_\_create_token_blacklist_table.sql

## PR Merge Requirements

To merge a pull request that adds/modifies migrations:

- [x] **Migration validation CI job must pass**
- [x] **All tests must pass**
- [x] **Code review approval**
- [x] **Migration follows naming convention**
- [x] **Rollback instructions documented**
- [x] **Local testing completed**

## Advanced Topics

### Repeatable Migrations

For SQL that should run on every migration (views, stored procedures):

```
R__create_user_stats_view.sql
```

**Note:** Repeatable migrations (R\_\_) are re-run whenever their checksum changes.

### Baseline Migrations

When adding Flyway to an existing database:

```bash
# Mark current state as baseline V0
./mvnw flyway:baseline -Dflyway.baseline-version=0
```

### Multiple Environments

Migrations apply identically across all environments:

- Local development
- CI/CD testing
- Staging
- Production

**Never** create environment-specific migrations.

## References

- [Flyway Documentation](https://flywaydb.org/documentation/)
- [Flyway Maven Plugin](https://flywaydb.org/documentation/usage/maven/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Backend CI Workflow](.github/workflows/backend-ci.yml)

## Support

For questions or issues with migrations:

1. Check this guide first
2. Review Flyway documentation
3. Check CI/CD logs in GitHub Actions
4. Ask in team chat with error details
