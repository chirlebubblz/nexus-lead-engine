'use server'
import { createClient } from '@/utils/supabase/server'
import { processEnrichment } from '@/lib/enrichment'
import { Lead } from '@/types'

/**
 * Server Action to run enriched sweep (enrichment) for a specific lead.
 * Enforces authenticated quota credits.
 */
export async function enrichedSweepAction(lead: Lead) {
  const supabase = await createClient()
  
  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Please log in to enrich leads." }

  // 1b. Role Logic - check if Admin
  const isAdmin = user.email === 'jeraf@gmail.com' // Adjust to your admin email

  if (!isAdmin) {
    // 2. Check Quota for Guests
    const { data: quota, error: quotaErr } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (quotaErr || !quota) return { error: "Could not find quota profile. Please contact support." }
    
    if (quota.credits_used >= quota.credits_total) {
      return { error: "Out of credits! Register for a Pro account for more sweeps." }
    }
  }

  // 3. Run the Scraper (Prong 1 & 2)
  try {
    const enrichedData = await processEnrichment(lead)
    
    // 4. If successful, increment the used credits (Guests only)
    if (!isAdmin) {
      const { data: quota } = await supabase
        .from('user_quotas')
        .select('credits_used')
        .eq('user_id', user.id)
        .single()
      
      if (quota) {
        await supabase
          .from('user_quotas')
          .update({ credits_used: quota.credits_used + 1 })
          .eq('user_id', user.id)
      }
    }

    return { data: enrichedData }
  } catch (err) {
    console.error("Enrichment error:", err);
    return { error: "Enrichment failed. Try again later." }
  }
}
