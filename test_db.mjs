import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env vars.");
    process.exit(1);
}

const serviceClient = createClient(supabaseUrl, supabaseKey);

async function test() {
    try {
        // Query a single row of leads to dump what columns it actually has
        const { data, error } = await serviceClient
            .from('leads')
            .select('*')
            .limit(1);

        if (error) {
            console.error("Supabase Error:", error);
        } else {
            console.log("Success Dump:", data);
        }
    } catch (err) {
        console.error("Catch Exception:", err);
    }
}
test();
