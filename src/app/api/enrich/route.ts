import { NextResponse } from 'next/server';
import pLimit from 'p-limit';
import { getServiceSupabase } from '@/lib/supabase';
import { updateLeadStatus } from '@/lib/leads';
import { processEnrichment } from '@/lib/enrichment';
import { Lead } from '@/types';

// FREE TIER LIMIT: Process exactly 1 lead at a time
const limit = pLimit(1);

// Helper function to force the app to pause
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { leadIds } = body;

        const idsToProcess: string[] = leadIds
            ? Array.isArray(leadIds) ? leadIds : [leadIds]
            : body.leadId ? [body.leadId] : [];

        if (idsToProcess.length === 0) {
            return NextResponse.json({ error: 'No lead IDs provided' }, { status: 400 });
        }

        const serviceClient = getServiceSupabase();

        // Allow both pending and failed leads to be processed so retries work
        const { data: leads, error } = await serviceClient
            .from('leads')
            .select('*')
            .in('id', idsToProcess)
            .in('status', ['pending', 'failed']);

        if (error || !leads || leads.length === 0) {
            return NextResponse.json({ message: 'No eligible leads found to process.', error });
        }

        const enrichmentPromises = leads.map((lead: Lead, index: number) =>
            limit(async () => {
                try {
                    // FREE TIER SPEED BUMP: 4-second pause between leads
                    if (index > 0) {
                        console.log(`[Rate Limit Guard] Sleeping for 4 seconds before lead ${index + 1}...`);
                        await sleep(4000);
                    }

                    await updateLeadStatus(lead.id, 'researching');

                    // processEnrichment no longer takes criteria after our earlier refactor
                    const enrichmentData = await processEnrichment(lead);

                    await updateLeadStatus(lead.id, enrichmentData.status as 'verified' | 'failed', enrichmentData);
                    console.log(`Successfully processed lead: ${lead.id}`);
                } catch (error) {
                    console.error(`Failed to process lead ${lead.id}:`, error);
                    await updateLeadStatus(lead.id, 'failed', {
                        enrichment_summary: 'Processing failed due to internal server error.'
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
