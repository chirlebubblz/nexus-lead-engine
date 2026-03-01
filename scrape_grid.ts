import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import pLimit from 'p-limit';

// Load environment variables from your Next.js local file
dotenv.config({ path: '.env.local' });

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GOOGLE_MAPS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing required environment variables. Check .env.local');
    process.exit(1);
}

// Use Service Role to bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const limit = pLimit(2); // Google Places rate limit protector (2 concurrent reqs max)

// --- CONFIGURATION ---
const SEARCH_QUERY = "marketing agency";
const STARTING_LAT = 37.7749; // e.g., San Francisco center
const STARTING_LNG = -122.4194;
const RADIUS_METERS = 2000; // 2km radius per search
const GRID_SIZE = 5; // Creates a 5x5 grid (25 total searches)
// ---------------------

// 1 degree lat/lng is roughly 111km. 
// We offset by about ~3km per step to ensure slight overlap.
const LAT_STEP = 0.027;
const LNG_STEP = 0.034;

async function searchGooglePlaces(query: string, lat: number, lng: number, radius: number) {
    const url = 'https://places.googleapis.com/v1/places:searchText';

    // Convert radius to a bounding box for the new Places API
    const latDelta = Math.abs(radius / 111320);
    const lngDelta = Math.abs(radius / (111320 * Math.cos(lat * Math.PI / 180)));

    const payload = {
        textQuery: query,
        locationRestriction: {
            rectangle: {
                low: { latitude: lat - latDelta, longitude: lng - lngDelta },
                high: { latitude: lat + latDelta, longitude: lng + lngDelta }
            }
        },
        languageCode: 'en',
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.name,places.formattedAddress,places.location,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Google API Error: ${await response.text()}`);
    const data = await response.json();
    return data.places || [];
}

async function runGridScraper() {
    console.log(`🚀 Starting Grid Scraper for "${SEARCH_QUERY}"...`);
    console.log(`📍 Center: ${STARTING_LAT}, ${STARTING_LNG} | Grid: ${GRID_SIZE}x${GRID_SIZE}`);

    let totalSaved = 0;
    const offset = Math.floor(GRID_SIZE / 2); // Center the grid
    const searchPromises = [];

    // Generate the grid
    for (let x = -offset; x <= offset; x++) {
        for (let y = -offset; y <= offset; y++) {
            const gridLat = STARTING_LAT + (x * LAT_STEP);
            const gridLng = STARTING_LNG + (y * LNG_STEP);

            searchPromises.push(limit(async () => {
                console.log(`Searching sector [${gridLat.toFixed(4)}, ${gridLng.toFixed(4)}]...`);
                try {
                    const places = await searchGooglePlaces(SEARCH_QUERY, gridLat, gridLng, RADIUS_METERS);

                    if (places.length === 0) return;

                    // Clean and map data for Supabase
                    const leadsToInsert = places.map((place: any) => {
                        let cleanedWebsite = place.websiteUri || null;
                        if (cleanedWebsite) {
                            try {
                                const urlObj = new URL(cleanedWebsite);
                                ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid'].forEach(param => urlObj.searchParams.delete(param));
                                cleanedWebsite = urlObj.toString().replace(/[?\/]$/, '');
                            } catch (e) { /* ignore */ }
                        }

                        return {
                            place_id: place.id,
                            business_name: place.displayName?.text || place.name || 'Unknown',
                            address: place.formattedAddress || 'No address provided',
                            latitude: place.location?.latitude || gridLat,
                            longitude: place.location?.longitude || gridLng,
                            website: cleanedWebsite,
                            phone: place.nationalPhoneNumber || null,
                            status: 'pending',
                            social_profiles: place.googleMapsUri ? { google: place.googleMapsUri } : null,
                            updated_at: new Date().toISOString()
                        };
                    }).filter((l: any) => l.place_id && l.business_name !== 'Unknown');

                    // Upsert batch to Supabase
                    const { error } = await supabase
                        .from('leads')
                        .upsert(leadsToInsert, { onConflict: 'place_id', ignoreDuplicates: true });

                    if (error) {
                        console.error(`❌ Supabase Insert Error:`, error.message);
                    } else {
                        totalSaved += leadsToInsert.length;
                        console.log(`✅ Saved ${leadsToInsert.length} leads from sector.`);
                    }

                } catch (err: any) {
                    console.error(`⚠️ Sector failed: ${err.message}`);
                }

                // Sleep to strictly avoid Google Maps rate limits
                await new Promise(resolve => setTimeout(resolve, 1500));
            }));
        }
    }

    await Promise.allSettled(searchPromises);
    console.log(`\n🎉 Grid Sweep Complete! Added/Updated approximately ${totalSaved} leads to the database.`);
    console.log(`Go to your dashboard to run the bulk AI enrichment.`);
}

runGridScraper();
