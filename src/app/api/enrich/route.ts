import { NextResponse } from 'next/server';
import pLimit from 'p-limit';
import { getServiceSupabase } from '@/lib/supabase';
import { updateLeadStatus } from '@/lib/leads';
import { processEnrichment } from '@/lib/enrichment';
import { Lead } from '@/types';

const limit = pLimit(5);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { leadIds, criteria } = body;

        const idsToProcess: string[] = leadIds
            ? Array.isArray(leadIds) ? leadIds : [leadIds]
            : body.leadId ? [body.leadId] : [];

        if (idsToProcess.length === 0) {
            return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 });
        }

        const serviceClient = getServiceSupabase();

        const { data: leads, error } = await serviceClient
            .from('leads')
            .select('*')
            .in('id', idsToProcess)
            .eq('status', 'pending');

        if (error || !leads || leads.length === 0) {
            return NextResponse.json({ message: 'No pending leads found to process.', error });
        }

        const enrichmentPromises = leads.map((lead: Lead) =>
            limit(async () => {
                try {
                    await updateLeadStatus(lead.id, 'researching');

                    // Pass the dynamic UI criteria to Gemini
                    const enrichmentData = await processEnrichment(lead, criteria);

                    await updateLeadStatus(lead.id, 'verified', enrichmentData);
                    console.log(`Successfully enriched lead: ${lead.id}`);
                } catch (error) {
                    console.error(`Failed to enrich lead ${lead.id}:`, error);
                    await updateLeadStatus(lead.id, 'failed', {
                        enrichment_summary: 'Processing failed due to internal error.'
                    });
                }
            })
        );

        await Promise.allSettled(enrichmentPromises);

        return NextResponse.json({
            message: 'Enrichment jobs completed',
            processed: leads.length
        });
    } catch (error: any) {
        console.error('API Enrich Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
