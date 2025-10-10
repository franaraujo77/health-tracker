-- Test data cleanup script
-- This script removes all test data and resets sequences for clean test isolation

-- Note: This is a template file. Update with your actual entity tables when they are created.
-- The order of deletion should respect foreign key constraints (delete children before parents).

-- Example: Clean up test data (when entities are created)
-- DELETE FROM activities WHERE user_id IN (1, 2, 3);
-- DELETE FROM health_metrics WHERE user_id IN (1, 2, 3);
-- DELETE FROM users WHERE id IN (1, 2, 3);

-- Alternative: Clean all data (use with caution)
-- TRUNCATE TABLE activities RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE health_metrics RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- Reset all sequences to start from 1
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;
-- ALTER SEQUENCE health_metrics_id_seq RESTART WITH 1;
-- ALTER SEQUENCE activities_id_seq RESTART WITH 1;

-- Clean up any temporary test schemas
-- DROP SCHEMA IF EXISTS test_temp CASCADE;