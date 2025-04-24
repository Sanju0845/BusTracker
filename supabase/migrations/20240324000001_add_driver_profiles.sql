-- Create driver_profiles table
CREATE TABLE IF NOT EXISTS driver_profiles (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    bus_number VARCHAR(20) NOT NULL,
    phone_number VARCHAR(15),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample driver profiles
INSERT INTO driver_profiles (username, password, full_name, bus_number, phone_number) VALUES
    ('TS21D0921', 'driver0921', 'Rajesh Kumar', 'TS07EP0921', '9876543210'),
    ('TS21D0922', 'driver0922', 'Suresh Reddy', 'TS07EP0922', '9876543211'),
    ('TS21D0923', 'driver0923', 'Venkat Rao', 'TS07EP0923', '9876543212'),
    ('TS21D0924', 'driver0924', 'Krishna Murthy', 'TS07EP0924', '9876543213'),
    ('TS21D0925', 'driver0925', 'Ramesh Babu', 'TS07EP0925', '9876543214');

-- Add indexes for faster lookups
CREATE INDEX idx_driver_profiles_username ON driver_profiles(username);
CREATE INDEX idx_driver_profiles_bus_number ON driver_profiles(bus_number); 