import { NextResponse } from 'next/server';
import pLimit from 'p-limit';
import { getServiceSupabase } from '@/lib/supabase';
import { updateLeadStatus } from '@/lib/leads';
import { processEnrichment } from '@/lib/enrichment';
import { Lead } from '@/types';

// Set concurrency limit for enrichment processing
const limit = pLimit(5); // Process up to 5 leads concurrently

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { leadIds } = body;

        // Support both single leadId (legacy) and leadIds array
        const idsToProcess: string[] = leadIds
            ? Array.isArray(leadIds) ? leadIds : [leadIds]
            : body.leadId ? [body.leadId] : [];

        if (idsToProcess.length === 0) {
            return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 });
        }

        const serviceClient = getServiceSupabase();

        // Fetch the leads that need processing
        const { data: leads, error } = await serviceClient
            .from('leads')
            .select('*')
            .in('id', idsToProcess)
            .eq('status', 'pending');

        if (error || !leads || leads.length === 0) {
            return NextResponse.json({ message: 'No pending leads found to process.', error });
        }

        // Process leads concurrently using p-limit
        const enrichmentPromises = leads.map((lead: Lead) =>
            limit(async () => {
                try {
                    // Update status to 'researching'
                    await updateLeadStatus(lead.id, 'researching');

                    // Trigger enrichment pipeline (Google Search, Cheerio, Gemini)
                    const enrichmentData = await processEnrichment(lead);

                    // Update status to 'verified' with new data
                    await updateLeadStatus(lead.id, 'verified', enrichmentData);
                    console.log(`Successfully enriched lead: ${lead.id}`);
                } catch (error) {
                    console.error(`Failed to enrich lead ${lead.id}:`, error);
                    // Mark as failed if an unhandled error occurs
                    await updateLeadStatus(lead.id, 'failed', {
                        enrichment_summary: 'Processing failed due to internal error.'
                    });
                }
            })
        );

        // Wait for all enrichments to complete
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
