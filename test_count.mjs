import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const clientAnon = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data, error } = await clientAnon.from('leads').select('id');
    console.log(`Total leads in DB: ${data ? data.length : 0}`);
}
check();
