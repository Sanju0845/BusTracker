-- Add stops for all routes
INSERT INTO stops (name, latitude, longitude) VALUES
    -- LB Nagar route stops
    ('LB Nagar Bus Stop', 17.3476, 78.5490),
    ('Kothapet Bus Stop', 17.3669, 78.5359),
    ('Dilsukhnagar Bus Stop', 17.3687, 78.5270),
    ('Malakpet Bus Stop', 17.3725, 78.5133),
    
    -- Secunderabad route stops
    ('Secunderabad Station', 17.4344, 78.5013),
    ('Paradise Circle', 17.4417, 78.4951),
    ('Patny Center', 17.4399, 78.4983),
    ('Sangeet Junction', 17.4371, 78.4989),
    
    -- Kukatpally route stops
    ('KPHB Colony', 17.4859, 78.3920),
    ('Malaysian Township', 17.4937, 78.3997),
    ('Forum Mall', 17.4945, 78.4090),
    ('JNTU', 17.4932, 78.3913),
    
    -- Uppal route stops
    ('Uppal Bus Stop', 17.4056, 78.5592),
    ('Survey of India', 17.4024, 78.5489),
    ('Tarnaka', 17.4037, 78.5282),
    ('Habsiguda', 17.4021, 78.5377),
    
    -- Mehdipatnam route stops
    ('Mehdipatnam Bus Stop', 17.3702, 78.4420),
    ('Masab Tank', 17.3897, 78.4525),
    ('Lakdikapul', 17.3947, 78.4640),
    ('Nampally', 17.3889, 78.4735),
    
    -- Common destination
    ('KMCE College', 17.3850, 78.6267);

-- Add route stops for TS07EP0921 (LB Nagar route)
INSERT INTO route_stops (bus_id, stop_id, stop_order, scheduled_time)
SELECT b.id, s.id, 
    CASE s.name
        WHEN 'LB Nagar Bus Stop' THEN 1
        WHEN 'Kothapet Bus Stop' THEN 2
        WHEN 'Dilsukhnagar Bus Stop' THEN 3
        WHEN 'Malakpet Bus Stop' THEN 4
        WHEN 'KMCE College' THEN 5
    END,
    CASE s.name
        WHEN 'LB Nagar Bus Stop' THEN '08:00'::TIME
        WHEN 'Kothapet Bus Stop' THEN '08:15'::TIME
        WHEN 'Dilsukhnagar Bus Stop' THEN '08:30'::TIME
        WHEN 'Malakpet Bus Stop' THEN '08:45'::TIME
        WHEN 'KMCE College' THEN '09:15'::TIME
    END
FROM buses b, stops s
WHERE b.bus_number = 'TS07EP0921'
AND s.name IN ('LB Nagar Bus Stop', 'Kothapet Bus Stop', 'Dilsukhnagar Bus Stop', 'Malakpet Bus Stop', 'KMCE College');

-- Add route stops for TS07EP0922 (Secunderabad route)
INSERT INTO route_stops (bus_id, stop_id, stop_order, scheduled_time)
SELECT b.id, s.id,
    CASE s.name
        WHEN 'Secunderabad Station' THEN 1
        WHEN 'Paradise Circle' THEN 2
        WHEN 'Patny Center' THEN 3
        WHEN 'Sangeet Junction' THEN 4
        WHEN 'KMCE College' THEN 5
    END,
    CASE s.name
        WHEN 'Secunderabad Station' THEN '08:15'::TIME
        WHEN 'Paradise Circle' THEN '08:30'::TIME
        WHEN 'Patny Center' THEN '08:45'::TIME
        WHEN 'Sangeet Junction' THEN '09:00'::TIME
        WHEN 'KMCE College' THEN '09:30'::TIME
    END
FROM buses b, stops s
WHERE b.bus_number = 'TS07EP0922'
AND s.name IN ('Secunderabad Station', 'Paradise Circle', 'Patny Center', 'Sangeet Junction', 'KMCE College');

-- Add route stops for TS07EP0923 (Kukatpally route)
INSERT INTO route_stops (bus_id, stop_id, stop_order, scheduled_time)
SELECT b.id, s.id,
    CASE s.name
        WHEN 'KPHB Colony' THEN 1
        WHEN 'Malaysian Township' THEN 2
        WHEN 'Forum Mall' THEN 3
        WHEN 'JNTU' THEN 4
        WHEN 'KMCE College' THEN 5
    END,
    CASE s.name
        WHEN 'KPHB Colony' THEN '08:00'::TIME
        WHEN 'Malaysian Township' THEN '08:20'::TIME
        WHEN 'Forum Mall' THEN '08:40'::TIME
        WHEN 'JNTU' THEN '09:00'::TIME
        WHEN 'KMCE College' THEN '09:45'::TIME
    END
FROM buses b, stops s
WHERE b.bus_number = 'TS07EP0923'
AND s.name IN ('KPHB Colony', 'Malaysian Township', 'Forum Mall', 'JNTU', 'KMCE College');

-- Add route stops for TS07EP0924 (Uppal route)
INSERT INTO route_stops (bus_id, stop_id, stop_order, scheduled_time)
SELECT b.id, s.id,
    CASE s.name
        WHEN 'Uppal Bus Stop' THEN 1
        WHEN 'Survey of India' THEN 2
        WHEN 'Tarnaka' THEN 3
        WHEN 'Habsiguda' THEN 4
        WHEN 'KMCE College' THEN 5
    END,
    CASE s.name
        WHEN 'Uppal Bus Stop' THEN '08:30'::TIME
        WHEN 'Survey of India' THEN '08:45'::TIME
        WHEN 'Tarnaka' THEN '09:00'::TIME
        WHEN 'Habsiguda' THEN '09:15'::TIME
        WHEN 'KMCE College' THEN '09:45'::TIME
    END
FROM buses b, stops s
WHERE b.bus_number = 'TS07EP0924'
AND s.name IN ('Uppal Bus Stop', 'Survey of India', 'Tarnaka', 'Habsiguda', 'KMCE College');

-- Add route stops for TS07EP0925 (Mehdipatnam route)
INSERT INTO route_stops (bus_id, stop_id, stop_order, scheduled_time)
SELECT b.id, s.id,
    CASE s.name
        WHEN 'Mehdipatnam Bus Stop' THEN 1
        WHEN 'Masab Tank' THEN 2
        WHEN 'Lakdikapul' THEN 3
        WHEN 'Nampally' THEN 4
        WHEN 'KMCE College' THEN 5
    END,
    CASE s.name
        WHEN 'Mehdipatnam Bus Stop' THEN '08:15'::TIME
        WHEN 'Masab Tank' THEN '08:35'::TIME
        WHEN 'Lakdikapul' THEN '08:55'::TIME
        WHEN 'Nampally' THEN '09:15'::TIME
        WHEN 'KMCE College' THEN '09:45'::TIME
    END
FROM buses b, stops s
WHERE b.bus_number = 'TS07EP0925'
AND s.name IN ('Mehdipatnam Bus Stop', 'Masab Tank', 'Lakdikapul', 'Nampally', 'KMCE College');

-- Create a view for easy querying of bus routes with stops
CREATE OR REPLACE VIEW bus_routes_view AS
SELECT 
    b.bus_number,
    b.route,
    s.name as stop_name,
    s.latitude,
    s.longitude,
    rs.stop_order,
    rs.scheduled_time
FROM buses b
JOIN route_stops rs ON rs.bus_id = b.id
JOIN stops s ON s.id = rs.stop_id
ORDER BY b.bus_number, rs.stop_order; 