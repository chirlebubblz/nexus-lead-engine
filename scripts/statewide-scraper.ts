import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import pLimit from 'p-limit';

// Load environment variables
dotenv.config({ path: '.env.local' });

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GOOGLE_MAPS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing required environment variables. Check .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const limit = pLimit(2); // Keep Google rate limits happy

// --- CONFIGURATION ---
const SEARCH_QUERY = "cleaning companies";
const RADIUS_METERS = 1000; // Drop radius to 1km (tighter circles)
const GRID_SIZE_PER_CITY = 10; // Change to a 10x10 grid (100 searches per city)

// The City Hopper List
// To do the whole country, you would replace this array by importing a JSON file 
// of all US zip codes or major cities.
const TARGET_CITIES = [
    { name: "Los Angeles, CA", lat: 34.0522, lng: -118.2437 },
    { name: "San Diego, CA", lat: 32.7157, lng: -117.1611 },
    { name: "San Jose, CA", lat: 37.3382, lng: -121.8863 },
    { name: "San Francisco, CA", lat: 37.7749, lng: -122.4194 },
    { name: "Fresno, CA", lat: 36.7378, lng: -119.7871 },
    { name: "Sacramento, CA", lat: 38.5816, lng: -121.4944 },
    { name: "Long Beach, CA", lat: 33.7701, lng: -118.1937 },
    { name: "Oakland, CA", lat: 37.8044, lng: -122.2712 },
    { name: "Bakersfield, CA", lat: 35.3733, lng: -119.0187 },
    { name: "Anaheim, CA", lat: 33.8366, lng: -117.9143 }
    // Add as many as you want here...
];
// ---------------------

const LAT_STEP = 0.035;
const LNG_STEP = 0.045;

async function searchGooglePlaces(query: string, lat: number, lng: number, radius: number) {
    const url = 'https://places.googleapis.com/v1/places:searchText';

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

async function runStatewideScraper() {
    console.log(`🚀 Starting Statewide City Hopper for "${SEARCH_QUERY}"...`);
    console.log(`🗺️  Targeting ${TARGET_CITIES.length} cities.`);

    let totalSavedAllCities = 0;
    const offset = Math.floor(GRID_SIZE_PER_CITY / 2);

    for (const city of TARGET_CITIES) {
        console.log(`\n========================================`);
        console.log(`🚁 Hopping to: ${city.name} (${city.lat}, ${city.lng})`);
        console.log(`========================================`);

        let citySavedCount = 0;
        const searchPromises = [];

        // Generate the micro-grid for this specific city
        for (let x = -offset; x <= offset; x++) {
            for (let y = -offset; y <= offset; y++) {
                const gridLat = city.lat + (x * LAT_STEP);
                const gridLng = city.lng + (y * LNG_STEP);

                searchPromises.push(limit(async () => {
                    try {
                        const places = await searchGooglePlaces(SEARCH_QUERY, gridLat, gridLng, RADIUS_METERS);
                        if (places.length === 0) return;

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

                        // Upsert to database (ignoreDuplicates: true prevents saving the same lead twice if grids overlap)
                        const { error } = await supabase
                            .from('leads')
                            .upsert(leadsToInsert, { onConflict: 'place_id', ignoreDuplicates: true });

                        if (error) {
                            console.error(`❌ Supabase Insert Error:`, error.message);
                        } else {
                            citySavedCount += leadsToInsert.length;
                        }
                    } catch (err: any) {
                        console.error(`⚠️ Sector failed in ${city.name}: ${err.message}`);
                    }

                    // 1.5 second delay between Google calls inside the city
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }));
            }
        }

        // Wait for this city's grid to completely finish
        await Promise.allSettled(searchPromises);
        totalSavedAllCities += citySavedCount;
        console.log(`✅ Finished ${city.name}. Found ${citySavedCount} potential leads.`);

        // Take a 5-second breather before hopping to the next city to keep APIs happy
        console.log(`⏳ Resting for 5 seconds before next city jump...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log(`\n🎉 STATEWIDE SWEEP COMPLETE!`);
    console.log(`📈 Total Leads Added/Updated across all cities: ${totalSavedAllCities}`);
    console.log(`Head over to your UI dashboard to bulk-enrich them!`);
}

runStatewideScraper();
