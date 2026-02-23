import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error("Missing Supabase env vars.");
    process.exit(1);
}

const clientAnon = createClient(supabaseUrl, supabaseAnonKey);
const clientService = createClient(supabaseUrl, supabaseServiceKey);

async function testFetch() {
    console.log("1. Writing a test lead using Service Key...");
    const testLead = {
        place_id: "test_" + Date.now(),
        business_name: "Test Frontend Read Lead",
        address: "123 Test St",
        latitude: 0,
        longitude: 0,
        status: 'pending'
    };

    const { error: insertError } = await clientService
        .from('leads')
        .upsert(testLead);

    if (insertError) {
        console.error("Insert failed! Schema might still be wrong:", insertError.message);
        return;
    }
    console.log("Insert successful.");

    console.log("2. Attempting to fetch leads using Anon Key (like the frontend)...");
    const { data: anonData, error: anonError } = await clientAnon
        .from('leads')
        .select('*');

    if (anonError) {
        console.error("Anon Fetch Error:", anonError.message);
    } else {
        console.log(`Anon Fetch Success! Found ${anonData.length} leads.`);
        if (anonData.length === 0) {
            console.log("WARNING: Anon fetch returned 0 leads. This means RLS is blocking read access!");
        } else {
            console.log("First lead:", anonData[0].business_name);
        }
    }
}

testFetch();
