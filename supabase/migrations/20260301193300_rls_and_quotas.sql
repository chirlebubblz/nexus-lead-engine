-- Enable RLS on the leads table (currently it is disabled and public)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone with a valid authenticated session to SELECT leads
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Allow authenticated read access'
    ) THEN
        CREATE POLICY "Allow authenticated read access" 
        ON public.leads 
        FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END $$;

-- Allow anyone with a valid authenticated session to UPDATE leads (e.g. status)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Allow authenticated updates'
    ) THEN
        CREATE POLICY "Allow authenticated updates" 
        ON public.leads 
        FOR UPDATE 
        TO authenticated 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- ----------------------------------------------------
-- CREATE user_quotas TABLE
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_quotas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    search_date DATE NOT NULL DEFAULT CURRENT_DATE,
    leads_fetched_today INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, search_date)
);

-- Enable RLS on user_quotas
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

-- Users can only read their own quotas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_quotas' AND policyname = 'Users can view own quotas'
    ) THEN
        CREATE POLICY "Users can view own quotas"
        ON public.user_quotas
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Notice: Service Role processes (like the background /api/search) will bypass RLS
-- to insert strings and update the quota records.

-- Trigger for updated_at in user_quotas
DROP TRIGGER IF EXISTS update_user_quotas_modtime ON public.user_quotas;
CREATE TRIGGER update_user_quotas_modtime
    BEFORE UPDATE ON public.user_quotas
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
