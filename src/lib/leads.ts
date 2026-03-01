import { getServiceSupabase, supabase } from './supabase';
import { InsertLead, Lead, UpdateLead } from '../types';

export async function upsertLead(leadData: InsertLead): Promise<Lead> {
    // Use service role for backend operations to bypass RLS
    const serviceClient = getServiceSupabase();
    const { data, error } = await serviceClient
        .from('leads')
        .upsert(
            { ...leadData, updated_at: new Date().toISOString() }, // Timestamp fix added here
            { onConflict: 'place_id' }
        )
        .select()
        .single();

    if (error) {
        throw new Error(`Error upserting lead: ${error.message}`);
    }

    return data;
}

export async function updateLeadStatus(id: string, status: Lead['status'], enrichmentData?: Partial<Lead>): Promise<Lead> {
    const serviceClient = getServiceSupabase();
    const { data, error } = await serviceClient
        .from('leads')
        .update({
            status,
            ...enrichmentData,
            updated_at: new Date().toISOString() // Added here as well for good measure
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new Error(`Error updating lead status: ${error.message}`);
    }

    return data;
}

export async function fetchAllLeads(): Promise<Lead[]> {
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching leads:', error);
        return [];
    }

    return data || [];
}

export async function deleteAllLeads(): Promise<void> {
    const serviceClient = getServiceSupabase();
    const { error } = await serviceClient
        .from('leads')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all trick

    if (error) {
        console.error('Failed to wipe previous leads:', error);
    }
}
