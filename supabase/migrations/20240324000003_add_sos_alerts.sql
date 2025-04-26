-- Create sos_alerts table
CREATE TABLE IF NOT EXISTS public.sos_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bus_number TEXT REFERENCES public.buses(bus_number),
    status TEXT CHECK (status IN ('pending', 'acknowledged', 'dismissed')) DEFAULT 'pending',
    location JSONB,
    action_taken TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Add RLS policies
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow insert for all users" ON public.sos_alerts;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.sos_alerts;
DROP POLICY IF EXISTS "Allow read for authenticated users" ON public.sos_alerts;

-- Allow insert for both authenticated and anonymous users
CREATE POLICY "Allow insert for all users" ON public.sos_alerts
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

-- Allow update for both authenticated and anonymous users
CREATE POLICY "Allow update for all users" ON public.sos_alerts
    FOR UPDATE TO authenticated, anon
    USING (true)
    WITH CHECK (true);

-- Allow read for both authenticated and anonymous users
CREATE POLICY "Allow read for all users" ON public.sos_alerts
    FOR SELECT TO authenticated, anon
    USING (true);

-- Add realtime support (only if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'sos_alerts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE sos_alerts;
    END IF;
END $$;

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_updated_at ON public.sos_alerts;

-- Add trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.sos_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 