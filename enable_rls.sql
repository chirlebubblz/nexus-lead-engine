-- Enable Row Level Security (RLS) on the public.leads table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Update user_quotas table to include credits
ALTER TABLE public.user_quotas 
ADD COLUMN IF NOT EXISTS credits_total INT DEFAULT 10,
ADD COLUMN IF NOT EXISTS credits_used INT DEFAULT 0;
