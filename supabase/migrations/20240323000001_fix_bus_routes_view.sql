-- Drop the existing view if it exists
DROP VIEW IF EXISTS bus_routes_view;

-- Recreate the view with explicit column selection
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
    arrival_time::time as arrival_time,
    departure_time::time as departure_time,
    stop_order
FROM bus_stops 
ORDER BY bus_number, stop_order; 