import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('ip_quotas').select('*').eq('search_date', today);
    console.log("Quotas for today:", data, error);
}
run();
