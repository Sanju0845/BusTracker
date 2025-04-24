-- First drop the dependent table
DROP TABLE IF EXISTS student_daily_attendance CASCADE;

-- Then drop the bus_locations table
DROP TABLE IF EXISTS bus_locations CASCADE;

-- Create bus_locations table
CREATE TABLE bus_locations (
    id SERIAL PRIMARY KEY,
    bus_number VARCHAR(20) NOT NULL REFERENCES buses(bus_number),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_coordinates CHECK (
        latitude BETWEEN -90 AND 90 AND
        longitude BETWEEN -180 AND 180
    )
);

-- Create index for faster queries
CREATE INDEX idx_bus_locations_bus_number ON bus_locations(bus_number);
CREATE INDEX idx_bus_locations_last_updated ON bus_locations(last_updated);

-- Recreate student_daily_attendance table
CREATE TABLE student_daily_attendance (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES student_profiles(username),
    bus_number VARCHAR(20) REFERENCES buses(bus_number),
    date DATE DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP WITH TIME ZONE,
    UNIQUE(student_id, date)
);

-- Add trigger to clean old locations (keep only last 24 hours)
CREATE OR REPLACE FUNCTION clean_old_locations() RETURNS trigger AS $$
BEGIN
    DELETE FROM bus_locations
    WHERE last_updated < NOW() - INTERVAL '24 hours';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_clean_old_locations
    AFTER INSERT ON bus_locations
    EXECUTE FUNCTION clean_old_locations();

-- Add initial data (without ON CONFLICT since we want multiple records per bus)
INSERT INTO bus_locations (bus_number, latitude, longitude) VALUES
    ('TS07EP0921', 17.3685468, 78.5329092),  -- Starting at Chaitanyapuri
    ('TS07EP0922', 17.4344, 78.5013),  -- Starting at Secunderabad
    ('TS07EP0923', 17.4859, 78.3920),  -- Starting at KPHB
    ('TS07EP0924', 17.4056, 78.5592),  -- Starting at Uppal
    ('TS07EP0925', 17.3702, 78.4420);   -- Starting at Mehdipatnam 