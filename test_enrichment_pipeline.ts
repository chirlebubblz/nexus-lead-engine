import { processEnrichment } from './src/lib/enrichment';

const mockLead = {
    id: "test",
    business_name: "Firefly Restaurant",
    address: "4288 24th St, San Francisco, CA 94114, USA",
    phone: "(415) 821-7652",
    website: "http://www.fireflysf.com",
    status: "pending",
    social_profiles: { google: "https://maps.google.com" }
};

async function test() {
    console.log("Starting full enrichment pipeline for:", mockLead.business_name);
    try {
        const result = await processEnrichment(mockLead as any);
        console.log("--- FINAL ENRICHMENT RESULT ---");
        console.dir(result, { depth: null });
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
