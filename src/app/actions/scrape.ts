'use server'
import { createClient } from '@/utils/supabase/server'
import { processEnrichment } from '@/lib/enrichment'
import { updateLeadStatus, getLeadById } from '@/lib/leads'

/**
 * Server Action to run enriched sweep (enrichment) for a specific lead.
 * Enforces authenticated quota credits.
 */
export async function runEnrichedSweep(leadId: string) {
  const supabase = await createClient()
  
  // 1. Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Authentication required")

  // 2. Fetch the quota
  // Note: user_quotas table uses user_id as the primary link
  const { data: quota, error: quotaError } = await supabase
    .from('user_quotas')
    .select('credits_total, credits_used')
    .eq('user_id', user.id)
    .single()

  // If no quota object exists, we can't proceed with credits.
  // In a real app, we might create a default quota here or handle the error.
  if (quotaError || !quota) {
      console.error("Quota fetch error:", quotaError);
      return { error: "Quota not found. Please contact support to set up your account." }
  }

  if (quota.credits_used >= quota.credits_total) {
    return { error: "Insufficient credits. Upgrade to Pro!" }
  }

  // 3. Trigger the scraper only if credits are okay
  try {
      const lead = await getLeadById(leadId);
      if (!lead) return { error: "Lead not found." };

      // Set status to researching
      await updateLeadStatus(leadId, 'researching');
      
      // Perform heavy enrichment
      const enrichmentData = await processEnrichment(lead);
      
      // Save result
      await updateLeadStatus(leadId, enrichmentData.status as 'verified' | 'failed', enrichmentData);

      // 4. Increment credits used
      const { error: updateError } = await supabase
        .from('user_quotas')
        .update({ credits_used: quota.credits_used + 1 })
        .eq('user_id', user.id);
      
      if (updateError) {
          console.error("Quota update error:", updateError);
          // We don't necessarily fail the whole request if the quota update fails,
          // but we should log it.
      }

      return { success: true, data: enrichmentData };
  } catch (error: any) {
      console.error("Enrichment action error:", error);
      await updateLeadStatus(leadId, 'failed', { 
          enrichment_summary: `Scrape failed: ${error.message || 'Internal Error'}` 
      });
      return { error: error.message || "Internal Server Error during enrichment" };
  }
}
