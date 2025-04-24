-- Create function to get count of waiting students per stop
create or replace function get_students_waiting_count(
  p_bus_number text,
  p_date date
)
returns table (
  stop_name text,
  count bigint
)
language sql
as $$
  select 
    stop_name,
    count(*) as count
  from student_daily_attendance
  where 
    bus_number = p_bus_number
    and date = p_date
    and is_coming = true
  group by stop_name;
$$;

-- Grant execute permission to authenticated and anonymous users
grant execute on function get_students_waiting_count to authenticated, anon; 