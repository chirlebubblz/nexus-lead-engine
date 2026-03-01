import { NextResponse } from 'next/server';
import { upsertLead, deleteAllLeads } from '@/lib/leads';
import pLimit from 'p-limit';
import { fastExtractSocials } from '@/lib/enrichment';
import { createClient } from '@/utils/supabase/server';
import { getServiceSupabase } from '@/lib/supabase';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const ADMIN_EMAIL = 'jerafisabalo@gmail.com';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { query, latitude, longitude, radius = 5000, pageToken: clientPageToken } = body;

        if (!query || !latitude || !longitude) {
            return NextResponse.json(
                { error: 'Missing required parameters: query, latitude, longitude' },
                { status: 400 }
            );
        }

        // Get Authenticated User
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check Quotes for Guest limit (100 per day)
        // Bypass quota entirely for Admin
        const isAdmin = user.email === ADMIN_EMAIL;

        const serviceSupabase = getServiceSupabase();
        const today = new Date().toISOString().split('T')[0];
        let currentFetched = 0;
        const GUEST_DAILY_LIMIT = 100;

        if (!isAdmin) {
            const { data: quotaTracker } = await serviceSupabase
                .from('user_quotas')
                .select('leads_fetched_today')
                .eq('user_id', user.id)
                .eq('search_date', today)
                .single();

            currentFetched = quotaTracker?.leads_fetched_today || 0;

            if (currentFetched >= GUEST_DAILY_LIMIT) {
                return NextResponse.json({
                    error: `Daily limit reached. Guests can only fetch ${GUEST_DAILY_LIMIT} leads per day.`
                }, { status: 403 });
            }
        }

        // Wipe the database ONLY if this is a fresh search (no pageToken provided)
        if (!clientPageToken) {
            await deleteAllLeads();
        }

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

        const newLeadsInserted = insertedLeads.length;

        if (newLeadsInserted > 0) {
            // Update User Quota safely only for Guests
            if (!isAdmin) {
                const newTotal = currentFetched + newLeadsInserted;
                await serviceSupabase
                    .from('user_quotas')
                    .upsert({
                        user_id: user.id,
                        search_date: today,
                        leads_fetched_today: newTotal
                    }, { onConflict: 'user_id, search_date' });
            }

            console.log(`Saved ${newLeadsInserted} leads. Awaiting manual enrichment.`);
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
