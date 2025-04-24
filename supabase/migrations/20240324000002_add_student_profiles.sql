-- Drop existing table if it exists
DROP TABLE IF EXISTS student_profiles;

-- Create student_profiles table
CREATE TABLE student_profiles (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert the student credentials
INSERT INTO student_profiles (username, password) 
VALUES 
    ('24p81a0447', 'kmce123$')
ON CONFLICT (username) 
DO UPDATE SET password = EXCLUDED.password;

-- Add more sample students if needed
INSERT INTO student_profiles (username, password) 
VALUES 
    ('24p81a0401', 'student123'),
    ('24p81a0402', 'student123')
ON CONFLICT (username) 
DO NOTHING;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_profiles_username ON student_profiles(username); 