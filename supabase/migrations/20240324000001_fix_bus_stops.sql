-- Delete existing stops for ts01ep0000
DELETE FROM bus_routes WHERE bus_number = 'ts01ep0000';

-- Insert the correct stops
INSERT INTO bus_routes (bus_number, stop_name, latitude, longitude, arrival_time, departure_time, stop_order) VALUES
('ts01ep0000', 'Dilsukhnagar bus stop', 17.36877, 78.52301, '08:00:00', '08:01:00', 1),
('ts01ep0000', 'Kothapet Bus Stop', 17.3684, 78.53716, '08:05:00', '08:06:00', 2),
('ts01ep0000', 'Victoria Memorial Bus stop', 17.36332, 78.54317, '08:10:00', '08:11:00', 3),
('ts01ep0000', 'LB Nagar Metro', 17.35495, 78.54592, '08:15:00', '08:16:00', 4),
('ts01ep0000', 'Sagar Ring Road', 17.34133, 78.54798, '08:25:00', '08:25:00', 5),
('ts01ep0000', 'Hastinapuram X Roads', 17.32899, 78.5546, '08:35:00', '08:35:00', 6),
('ts01ep0000', 'KMCE College', 17.22527, 78.60654, '09:15:00', '09:15:00', 7); 