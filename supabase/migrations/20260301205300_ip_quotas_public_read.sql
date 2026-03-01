-- ----------------------------------------------------
-- CREATE ip_quotas TABLE for unauthenticated guests
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ip_quotas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address TEXT NOT NULL,
    search_date DATE NOT NULL DEFAULT CURRENT_DATE,
    leads_fetched_today INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(ip_address, search_date)
);

-- Enable RLS on ip_quotas (even though Service Role manages it)
ALTER TABLE public.ip_quotas ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at in ip_quotas
DROP TRIGGER IF EXISTS update_ip_quotas_modtime ON public.ip_quotas;
CREATE TRIGGER update_ip_quotas_modtime
    BEFORE UPDATE ON public.ip_quotas
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- ----------------------------------------------------
-- UPDATE leads TABLE RLS FOR PUBLIC ACCESS
-- ----------------------------------------------------
-- Allow anyone (public/anon) to SELECT leads so the dashboard works without login
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" 
        ON public.leads 
        FOR SELECT 
        USING (true);
    END IF;
END $$;
