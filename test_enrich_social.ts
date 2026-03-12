import { processEnrichment } from './src/lib/enrichment';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function run() {
    const lead = {
        id: '123',
        place_id: 'abc',
        business_name: 'Vercel',
        address: 'San Francisco, CA',
        phone: null,
        website: 'https://vercel.com',
        status: 'pending',
        social_profiles: { google: 'https://maps.google.com/?cid=123' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    console.log("Starting enrichment...");
    try {
        const result = await processEnrichment(lead as any);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error(e);
    }
}
run();
