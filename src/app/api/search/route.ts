import { NextResponse } from 'next/server';
import { upsertLead, deleteAllLeads } from '@/lib/leads';
import pLimit from 'p-limit';
import { fastExtractSocials } from '@/lib/enrichment';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { query, latitude, longitude, radius = 5000 } = body;

        if (!query || !latitude || !longitude) {
            return NextResponse.json(
                { error: 'Missing required parameters: query, latitude, longitude' },
                { status: 400 }
            );
        }

        // Wipe the database of previous search results for a clean slate
        await deleteAllLeads();

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const r = parseFloat(radius);

        // Google 'locationRestriction' only supports 'rectangle' for TextSearch.
        // We must convert the circle radius (in meters) to a bounding box.
        // 1 degree of latitude is approximately 111,320 meters.
        const latDelta = Math.abs(r / 111320);
        const lngDelta = Math.abs(r / (111320 * Math.cos(lat * Math.PI / 180)));

        const minLat = lat - latDelta;
        const maxLat = lat + latDelta;
        const minLng = lng - lngDelta;
        const maxLng = lng + lngDelta;

        // Call Google Places API New (Text Search)
        const url = 'https://places.googleapis.com/v1/places:searchText';

        let places: any[] = [];
        let pageToken = '';
        let pagesFetched = 0;
        const MAX_PAGES = 3; // Up to 60 leads total (20 per page)

        while (pagesFetched < MAX_PAGES) {
            const payload: any = {
                textQuery: query,
                locationRestriction: {
                    rectangle: {
                        low: {
                            latitude: Math.min(minLat, maxLat),
                            longitude: Math.min(minLng, maxLng),
                        },
                        high: {
                            latitude: Math.max(minLat, maxLat),
                            longitude: Math.max(minLng, maxLng),
                        }
                    },
                },
                languageCode: 'en',
            };

            if (pageToken) {
                payload.pageToken = pageToken;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
                    'X-Goog-FieldMask': 'places.id,places.displayName,places.name,places.formattedAddress,places.location,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,nextPageToken',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Google Places API Error:', errorText);
                if (pagesFetched === 0) {
                    return NextResponse.json({ error: 'Failed to fetch places from Google Maps' }, { status: 500 });
                }
                break; // Stop fetching more pages if an error occurs but keep what we have
            }

            const data = await response.json();
            if (data.places) {
                places = places.concat(data.places);
            }

            pageToken = data.nextPageToken;
            pagesFetched++;

            if (!pageToken) {
                break; // No more pages available
            }
        }

        const insertedLeads = [];
        const insertionErrors: any[] = [];

        // Save each place to Supabase leads table with lightning-fast regex checking
        const limit = pLimit(10); // Fetch up to 10 bare-metal HTML pages concurrently

        const processPromises = places.map((place: any) => limit(async () => {
            const rawName = place.displayName?.text || place.name || 'Unknown Business';

            if (!place.id || rawName === 'Unknown Business') return;

            let cleanedWebsite = place.websiteUri || null;
            if (cleanedWebsite) {
                try {
                    const urlObj = new URL(cleanedWebsite);
                    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
                    paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
                    cleanedWebsite = urlObj.toString();
                    if (cleanedWebsite.endsWith('?')) cleanedWebsite = cleanedWebsite.slice(0, -1);
                    if (cleanedWebsite.endsWith('/')) cleanedWebsite = cleanedWebsite.slice(0, -1);
                } catch (e) {
                    // Invalid URL, keep original
                }
            }

            // INSTANT SOCIAL EXTRACTION:
            // Fetch the bare HTML, look for social links, and insert them immediately.
            let initialSocialProfiles: Record<string, string> = {};
            if (place.googleMapsUri) {
                initialSocialProfiles.google = place.googleMapsUri;
            }

            let initialEmail: string | null = null;
            if (cleanedWebsite) {
                const fastSocials = await fastExtractSocials(cleanedWebsite);
                if (fastSocials) {
                    initialSocialProfiles = { ...initialSocialProfiles, ...fastSocials.profiles };
                    if (fastSocials.email) {
                        initialEmail = fastSocials.email;
                    }
                }
            }

            const leadData = {
                place_id: place.id,
                business_name: rawName,
                address: place.formattedAddress || 'No address provided',
                latitude: place.location?.latitude || latitude,
                longitude: place.location?.longitude || longitude,
                website: cleanedWebsite,
                phone: place.nationalPhoneNumber || null,
                contact_email: initialEmail,
                status: 'pending' as const,
                social_profiles: Object.keys(initialSocialProfiles).length > 0 ? initialSocialProfiles : null,
            };

            try {
                const lead = await upsertLead(leadData);
                insertedLeads.push(lead);
            } catch (err: any) {
                console.error(`Failed to upsert lead for place ${place.id}:`, err);
                insertionErrors.push({ place_id: place.id, error: err.message || err.toString() });
            }
        }));

        await Promise.all(processPromises);

        if (insertedLeads.length > 0) {
            // [AI ENRICHMENT REMOVED]
            // We NO LONGER auto-trigger the background worker.
            // Users will manually trigger enrichment individually from the UI.
            console.log(`Saved ${insertedLeads.length} leads. Awaiting manual enrichment.`);
        }

        return NextResponse.json({
            message: 'Search completed',
            totalFound: places.length,
            inserted: insertedLeads.length,
            errors: insertionErrors.length > 0 ? insertionErrors : undefined
        });

    } catch (error: any) {
        console.error('Search API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
