-- Drop all existing tables
DROP TABLE IF EXISTS route_stops CASCADE;
DROP TABLE IF EXISTS stops CASCADE;
DROP VIEW IF EXISTS bus_routes_view CASCADE;
DROP TABLE IF EXISTS bus_TS07EP0921 CASCADE;
DROP TABLE IF EXISTS bus_TS07EP0922 CASCADE;
DROP TABLE IF EXISTS bus_TS07EP0923 CASCADE;
DROP TABLE IF EXISTS bus_TS07EP0924 CASCADE;
DROP TABLE IF EXISTS bus_TS07EP0925 CASCADE;

-- Create separate tables for each bus
CREATE TABLE bus_TS07EP0921 (
    stop_name TEXT PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    arrival_time TIME NOT NULL,
    departure_time TIME NOT NULL,
    stop_order INTEGER NOT NULL
);

CREATE TABLE bus_TS07EP0922 (
    stop_name TEXT PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    arrival_time TIME NOT NULL,
    departure_time TIME NOT NULL,
    stop_order INTEGER NOT NULL
);

CREATE TABLE bus_TS07EP0923 (
    stop_name TEXT PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    arrival_time TIME NOT NULL,
    departure_time TIME NOT NULL,
    stop_order INTEGER NOT NULL
);

CREATE TABLE bus_TS07EP0924 (
    stop_name TEXT PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    arrival_time TIME NOT NULL,
    departure_time TIME NOT NULL,
    stop_order INTEGER NOT NULL
);

CREATE TABLE bus_TS07EP0925 (
    stop_name TEXT PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    arrival_time TIME NOT NULL,
    departure_time TIME NOT NULL,
    stop_order INTEGER NOT NULL
);

-- Insert stops for TS07EP0921 (LB Nagar route)
INSERT INTO bus_TS07EP0921 (stop_name, latitude, longitude, arrival_time, departure_time, stop_order) VALUES
    ('Chaitanyapuri bus stop', 17.3685468, 78.5329092, '08:00:00', '08:01:00', 1),
    ('Kothapet Bus Stop', 17.3684, 78.53716, '08:05:00', '08:06:00', 2),
    ('Astalaxmi Kaman', 17.36332, 78.54317, '08:07:00', '08:07:00', 3),
    ('NTR Nagar', 17.35607, 78.54556, '08:08:00', '08:08:00', 4),
    ('LB Nagar Metro', 17.35495, 78.54592, '08:10:00', '08:10:00', 5),
    ('Panama', 17.33848, 78.56871, '08:20:00', '08:20:00', 6),
    ('Red Water Tank', 17.32908, 78.56895, '08:25:00', '08:25:00', 7),
    ('KMCE College', 17.385, 78.6267, '09:15:00', '09:15:00', 8);

-- Insert stops for TS07EP0922 (Secunderabad route)
INSERT INTO bus_TS07EP0922 (stop_name, latitude, longitude, arrival_time, departure_time, stop_order) VALUES
    ('Secunderabad Station', 17.4344, 78.5013, '08:10:00', '08:15:00', 1),
    ('Paradise Circle', 17.4417, 78.4951, '08:30:00', '08:35:00', 2),
    ('Patny Center', 17.4399, 78.4983, '08:45:00', '08:50:00', 3),
    ('Sangeet Junction', 17.4371, 78.4989, '09:00:00', '09:05:00', 4),
    ('KMCE College', 17.3850, 78.6267, '09:30:00', '09:30:00', 5);

-- Insert stops for TS07EP0923 (Kukatpally route)
INSERT INTO bus_TS07EP0923 (stop_name, latitude, longitude, arrival_time, departure_time, stop_order) VALUES
    ('KPHB Colony', 17.4859, 78.3920, '07:55:00', '08:00:00', 1),
    ('Malaysian Township', 17.4937, 78.3997, '08:20:00', '08:25:00', 2),
    ('Forum Mall', 17.4945, 78.4090, '08:40:00', '08:45:00', 3),
    ('JNTU', 17.4932, 78.3913, '09:00:00', '09:05:00', 4),
    ('KMCE College', 17.3850, 78.6267, '09:45:00', '09:45:00', 5);

-- Insert stops for TS07EP0924 (Uppal route)
INSERT INTO bus_TS07EP0924 (stop_name, latitude, longitude, arrival_time, departure_time, stop_order) VALUES
    ('Uppal Bus Stop', 17.4056, 78.5592, '08:25:00', '08:30:00', 1),
    ('Survey of India', 17.4024, 78.5489, '08:45:00', '08:50:00', 2),
    ('Tarnaka', 17.4037, 78.5282, '09:00:00', '09:05:00', 3),
    ('Habsiguda', 17.4021, 78.5377, '09:15:00', '09:20:00', 4),
    ('KMCE College', 17.3850, 78.6267, '09:45:00', '09:45:00', 5);

-- Insert stops for TS07EP0925 (Mehdipatnam route)
INSERT INTO bus_TS07EP0925 (stop_name, latitude, longitude, arrival_time, departure_time, stop_order) VALUES
    ('Mehdipatnam Bus Stop', 17.3702, 78.4420, '08:10:00', '08:15:00', 1),
    ('Masab Tank', 17.3897, 78.4525, '08:35:00', '08:40:00', 2),
    ('Lakdikapul', 17.3947, 78.4640, '08:55:00', '09:00:00', 3),
    ('Nampally', 17.3889, 78.4735, '09:15:00', '09:20:00', 4),
    ('KMCE College', 17.3850, 78.6267, '09:45:00', '09:45:00', 5);

-- Create a view to make it easier to query any bus's stops
CREATE OR REPLACE VIEW bus_routes_view AS
WITH bus_stops AS (
    SELECT 
        'TS07EP0921' as bus_number, 
        stop_name, 
        latitude, 
        longitude, 
        arrival_time,
        departure_time,
        stop_order 
    FROM bus_TS07EP0921
    UNION ALL
    SELECT 
        'TS07EP0922' as bus_number, 
        stop_name, 
        latitude, 
        longitude, 
        arrival_time,
        departure_time,
        stop_order 
    FROM bus_TS07EP0922
    UNION ALL
    SELECT 
        'TS07EP0923' as bus_number, 
        stop_name, 
        latitude, 
        longitude, 
        arrival_time,
        departure_time,
        stop_order 
    FROM bus_TS07EP0923
    UNION ALL
    SELECT 
        'TS07EP0924' as bus_number, 
        stop_name, 
        latitude, 
        longitude, 
        arrival_time,
        departure_time,
        stop_order 
    FROM bus_TS07EP0924
    UNION ALL
    SELECT 
        'TS07EP0925' as bus_number, 
        stop_name, 
        latitude, 
        longitude, 
        arrival_time,
        departure_time,
        stop_order 
    FROM bus_TS07EP0925
)
SELECT 
    bus_number,
    stop_name,
    latitude,
    longitude,
    arrival_time,
    departure_time,
    stop_order
FROM bus_stops 
ORDER BY bus_number, stop_order;

-- Grant necessary permissions
GRANT SELECT ON bus_routes_view TO authenticated;
GRANT SELECT ON bus_routes_view TO anon; 