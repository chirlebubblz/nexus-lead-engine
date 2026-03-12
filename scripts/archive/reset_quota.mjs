import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Resetting all quotas for today...");
    const { error } = await supabase.from('ip_quotas').update({ leads_fetched_today: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("Done", error);
}
run();
