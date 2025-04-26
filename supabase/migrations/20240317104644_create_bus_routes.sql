-- Create bus_routes table and insert stops
CREATE TABLE IF NOT EXISTS public.bus_routes (
  id SERIAL PRIMARY KEY,
  bus_number TEXT NOT NULL,
  stop_name TEXT NOT NULL,
  latitude FLOAT8 NOT NULL,
  longitude FLOAT8 NOT NULL,
  arrival_time TIME NOT NULL,
  departure_time TIME NOT NULL,
  stop_order INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert stops for TS07EP0921
INSERT INTO public.bus_routes (bus_number, stop_name, latitude, longitude, arrival_time, departure_time, stop_order) VALUES
  ('TS07EP0921', 'Dilsukhnagar bus stop', 17.36877, 78.52301, '08:00:00', '08:01:00', 1),
  ('TS07EP0921', 'Kothapet Bus Stop', 17.3684, 78.53716, '08:05:00', '08:06:00', 2),
  ('TS07EP0921', 'Victoria Memorial Bus stop', 17.36332, 78.54317, '08:10:00', '08:11:00', 3),
  ('TS07EP0921', 'LB Nagar Metro', 17.35495, 78.54592, '08:15:00', '08:16:00', 4),
  ('TS07EP0921', 'Sagar Ring Road', 17.34133, 78.54798, '08:25:00', '08:25:00', 5),
  ('TS07EP0921', 'Hastinapuram X Roads', 17.32899, 78.5546, '08:35:00', '08:35:00', 6),
  ('TS07EP0921', 'KMCE College', 17.22527, 78.60654, '09:15:00', '09:15:00', 7); 