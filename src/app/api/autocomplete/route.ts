import { NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const input = searchParams.get('input');

    if (!input) {
        return NextResponse.json({ error: 'Input parameter is required' }, { status: 400 });
    }

    if (!GOOGLE_MAPS_API_KEY) {
        return NextResponse.json({ error: 'Google Maps API Key not configured' }, { status: 500 });
    }

    try {
        // Use Google Places API (New) for Autocomplete
        const url = 'https://places.googleapis.com/v1/places:autocomplete';

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
            },
            body: JSON.stringify({
                input: input,
                includedPrimaryTypes: ['locality', 'administrative_area_level_1', 'country'],
            })
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('Google Autocomplete API Error:', data);
            return NextResponse.json({ error: 'Failed to fetch autocomplete suggestions' }, { status: 500 });
        }

        const predictions = (data.suggestions || []).map((suggestion: any) => {
            const placePrediction = suggestion.placePrediction;
            if (!placePrediction) return null;

            return {
                place_id: placePrediction.placeId,
                description: placePrediction.text.text,
                main_text: placePrediction.structuredFormat?.mainText?.text || placePrediction.text.text,
                secondary_text: placePrediction.structuredFormat?.secondaryText?.text || '',
            };
        }).filter(Boolean);

        return NextResponse.json({ predictions });
    } catch (error) {
        console.error('API Autocomplete Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
