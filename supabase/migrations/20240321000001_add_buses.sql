-- Add 5 buses
INSERT INTO buses (bus_number, route) VALUES
    ('TS07EP0921', 'LB Nagar - KMCE'),
    ('TS07EP0922', 'Secunderabad - KMCE'),
    ('TS07EP0923', 'Kukatpally - KMCE'),
    ('TS07EP0924', 'Uppal - KMCE'),
    ('TS07EP0925', 'Mehdipatnam - KMCE');

-- To remove buses if needed:
-- DELETE FROM buses WHERE bus_number LIKE 'TS07EP092%'; 