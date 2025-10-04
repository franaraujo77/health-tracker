-- Enable pg_stat_statements extension for query performance monitoring
-- This extension tracks query execution statistics and is essential for
-- identifying slow queries and performance bottlenecks

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Verify extension is installed
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'pg_stat_statements';

-- Grant permissions to application user to read statistics
-- Note: This assumes the healthtracker user exists from V1 migration
GRANT SELECT ON pg_stat_statements TO healthtracker;

-- Display configuration
SELECT name, setting, unit, short_desc
FROM pg_settings
WHERE name LIKE 'pg_stat_statements%';
