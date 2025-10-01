-- Create audit_logs table for HIPAA compliance
-- Records all PHI access and modifications
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    timestamp TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    details TEXT,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for efficient audit log queries
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Audit log for HIPAA compliance - records all PHI access';
COMMENT ON COLUMN audit_logs.action IS 'Action performed: READ, CREATE, UPDATE, DELETE';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource: HEALTH_METRICS, HEALTH_PROFILE, GOAL, USER';
COMMENT ON COLUMN audit_logs.timestamp IS 'Time of the action (immutable)';
