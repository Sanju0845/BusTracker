-- Create student profiles table
create table public.student_profiles (
    id uuid default gen_random_uuid() primary key,
    username varchar(255) unique not null,
    password varchar(255) not null,
    full_name varchar(255),
    roll_number varchar(50),
    created_at timestamptz default now()
);

-- Create driver profiles table
create table public.driver_profiles (
    id uuid default gen_random_uuid() primary key,
    username varchar(255) unique not null,
    password varchar(255) not null,
    full_name varchar(255),
    license_number varchar(50),
    created_at timestamptz default now()
);

-- Insert sample data for testing
insert into public.student_profiles (username, password, full_name, roll_number) 
values 
('24P81A0447', 'Kmce123$', 'Test Student', '24P81A0447');

insert into public.driver_profiles (username, password, full_name, license_number)
values 
('DRIVER001', 'BusDriver123$', 'Test Driver', 'DL123456789'); 