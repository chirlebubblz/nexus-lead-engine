
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    place_id TEXT UNIQUE NOT NULL,
    business_name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    website TEXT,
    phone TEXT,
    status TEXT DEFAULT 'pending',
    decision_maker_name TEXT,
    decision_maker_role TEXT,
    social_profiles JSONB,
    contact_email TEXT,
    enrichment_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: We only add missing columns below just in case the table already exists 
-- partially from the user's dashboard UI creation.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS place_id TEXT UNIQUE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS longitude FLOAT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS decision_maker_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS decision_maker_role TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS social_profiles JSONB;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS enrichment_summary TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Clean up any 'name' column if it exists mistakenly
ALTER TABLE public.leads DROP COLUMN IF EXISTS name;
