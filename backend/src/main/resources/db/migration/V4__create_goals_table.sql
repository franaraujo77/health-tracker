-- Create goals table for user health goals and progress tracking
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL,
    target_value NUMERIC(10, 2),
    current_value NUMERIC(10, 2),
    start_date DATE,
    end_date DATE,
    status VARCHAR(20)
);

COMMENT ON TABLE goals IS 'User health goals with progress tracking';
COMMENT ON COLUMN goals.goal_type IS 'Type of goal (e.g., weight_loss, steps_daily, sleep_hours)';
COMMENT ON COLUMN goals.target_value IS 'Target value to achieve';
COMMENT ON COLUMN goals.current_value IS 'Current progress value';
COMMENT ON COLUMN goals.status IS 'Goal status (e.g., active, completed, cancelled)';
