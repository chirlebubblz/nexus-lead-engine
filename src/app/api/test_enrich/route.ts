import { NextResponse } from 'next/server';
import { processEnrichment } from '@/lib/enrichment';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url') || 'https://solarclean.com';
    const name = searchParams.get('name') || 'Solar Clean';

    const lead = {
        id: '123',
        place_id: 'abc',
        business_name: name,
        address: 'Southern California',
        phone: null,
        website: url,
        status: 'pending',
        social_profiles: { google: 'https://maps.google.com/?cid=123' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    try {
        const result = await processEnrichment(lead as any);
        return NextResponse.json({ success: true, result });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message || e.toString() });
    }
}
