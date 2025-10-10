-- Test data setup script
-- This script provides common test data that can be used across multiple test scenarios

-- Note: This is a template file. Actual test data should be specific to your domain models.
-- Replace the examples below with your actual entity tables when they are created.

-- Example: Insert test users (when user entity is created)
-- INSERT INTO users (id, username, email, created_at, updated_at) VALUES
-- (1, 'testuser1', 'test1@example.com', NOW(), NOW()),
-- (2, 'testuser2', 'test2@example.com', NOW(), NOW()),
-- (3, 'testuser3', 'test3@example.com', NOW(), NOW());

-- Example: Insert test health metrics (when health_metric entity is created)
-- INSERT INTO health_metrics (id, user_id, metric_type, value, unit, recorded_at) VALUES
-- (1, 1, 'WEIGHT', 70.5, 'kg', NOW() - INTERVAL '1 day'),
-- (2, 1, 'HEIGHT', 175.0, 'cm', NOW() - INTERVAL '2 days'),
-- (3, 2, 'WEIGHT', 68.2, 'kg', NOW() - INTERVAL '1 day'),
-- (4, 2, 'BLOOD_PRESSURE_SYSTOLIC', 120, 'mmHg', NOW()),
-- (5, 2, 'BLOOD_PRESSURE_DIASTOLIC', 80, 'mmHg', NOW());

-- Example: Insert test activities (when activity entity is created)
-- INSERT INTO activities (id, user_id, activity_type, duration_minutes, calories_burned, recorded_at) VALUES
-- (1, 1, 'RUNNING', 30, 250, NOW() - INTERVAL '1 day'),
-- (2, 1, 'CYCLING', 45, 320, NOW() - INTERVAL '2 days'),
-- (3, 2, 'WALKING', 60, 180, NOW() - INTERVAL '1 day'),
-- (4, 3, 'SWIMMING', 40, 280, NOW());

-- Reset sequences to ensure consistent test IDs
-- SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
-- SELECT setval('health_metrics_id_seq', (SELECT MAX(id) FROM health_metrics));
-- SELECT setval('activities_id_seq', (SELECT MAX(id) FROM activities));