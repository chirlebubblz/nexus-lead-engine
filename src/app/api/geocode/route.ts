import { NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('placeId');

    if (!placeId) {
        return NextResponse.json({ error: 'placeId parameter is required' }, { status: 400 });
    }

    if (!GOOGLE_MAPS_API_KEY) {
        return NextResponse.json({ error: 'Google Maps API Key not configured' }, { status: 500 });
    }

    try {
        const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=location`;

        const res = await fetch(url, {
            headers: {
                'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
            }
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('Google Places (New) API Error:', data);
            return NextResponse.json({ error: 'Failed to fetch place details' }, { status: 500 });
        }

        const location = data.location;
        if (!location || !location.latitude || !location.longitude) {
            return NextResponse.json({ error: 'No location found for place ID' }, { status: 404 });
        }

        return NextResponse.json({
            lat: location.latitude,
            lng: location.longitude
        });
    } catch (error) {
        console.error('API Geocode Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
