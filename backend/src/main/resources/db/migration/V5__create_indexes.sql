-- Create performance indexes for frequently queried columns

-- Index for querying health metrics by user and date range
CREATE INDEX idx_metrics_user_date ON health_metrics(user_id, recorded_at DESC);

-- Index for filtering active goals by user
CREATE INDEX idx_goals_user_status ON goals(user_id, status);

-- Index for user lookup by email (already has UNIQUE constraint, but explicit for clarity)
CREATE INDEX idx_users_email ON users(email);

-- Index for health metrics by type for analytics queries
CREATE INDEX idx_metrics_type ON health_metrics(metric_type);

COMMENT ON INDEX idx_metrics_user_date IS 'Optimizes queries for user health metrics over time ranges';
COMMENT ON INDEX idx_goals_user_status IS 'Optimizes queries for active/completed goals per user';
COMMENT ON INDEX idx_metrics_type IS 'Supports analytics queries aggregating by metric type';
