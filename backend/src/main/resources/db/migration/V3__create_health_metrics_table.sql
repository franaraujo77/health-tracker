-- Create health_metrics table for time-series health data
CREATE TABLE health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    value NUMERIC(10, 2),
    unit VARCHAR(20),
    recorded_at TIMESTAMP NOT NULL,
    source VARCHAR(50)
);

COMMENT ON TABLE health_metrics IS 'Time-series health metrics (vitals, activity, nutrition, sleep)';
COMMENT ON COLUMN health_metrics.metric_type IS 'Type of metric (e.g., heart_rate, steps, calories, sleep_hours)';
COMMENT ON COLUMN health_metrics.value IS 'Numeric value of the metric';
COMMENT ON COLUMN health_metrics.unit IS 'Unit of measurement (e.g., bpm, steps, kcal, hours)';
COMMENT ON COLUMN health_metrics.source IS 'Data source (e.g., manual, fitbit, apple_health)';
