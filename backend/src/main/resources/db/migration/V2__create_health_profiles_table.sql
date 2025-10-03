-- Create health_profiles table for user health information
CREATE TABLE health_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender VARCHAR(50),
    height_cm NUMERIC(5, 2),
    medical_history_encrypted TEXT,
    CONSTRAINT uk_health_profiles_user UNIQUE (user_id)
);

COMMENT ON TABLE health_profiles IS 'User health profile with personal health information';
COMMENT ON COLUMN health_profiles.medical_history_encrypted IS 'Encrypted medical history for HIPAA compliance';
COMMENT ON COLUMN health_profiles.height_cm IS 'Height in centimeters with 2 decimal precision';
