import { GoogleGenerativeAI } from '@google/generative-ai';
import { Lead } from '@/types';

// Environment variables
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
        responseMimeType: "application/json",
    }
});

// --- HELPER: Gemini API with Exponential Backoff ---
async function callGeminiWithBackoff(prompt: string, maxRetries = 3): Promise<string> {
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxRetries) {
        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error: any) {
            if (error?.status === 429 || error?.status === 503) {
                attempt++;
                console.warn(`Gemini API rate limited (Attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            } else {
                throw error;
            }
        }
    }
    throw new Error('Gemini API failed after max retries due to rate limiting.');
}

// --- HELPER: Google Custom Search Fallback ---
async function searchGoogle(query: string) {
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CX) {
        console.warn('Google Custom Search keys not configured.');
        return [];
    }
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        return data.items || [];
    } catch (error) {
        console.error('Google Search API error:', error);
        return [];
    }
}

// --- HELPER: Jina AI Web Scraper ---
async function scrapeWebsiteWithAPI(url: string): Promise<string> {
    try {
        console.log(`Sending ${url} to Jina AI Reader API...`);
        // Jina AI renders the JavaScript and returns clean Markdown containing all links and text
        const response = await fetch(`https://r.jina.ai/${url}`, {
            headers: {
                'Accept': 'text/plain',
                'X-Return-Format': 'markdown'
            }
        });

        if (!response.ok) return '';

        const markdown = await response.text();
        // Give Gemini up to 15,000 characters of context (plenty for finding contact info and socials)
        return markdown.substring(0, 15000);
    } catch (error) {
        console.error(`Scraping API failed for ${url}:`, error);
        return '';
    }
}

// --- MAIN ENGINE: Process Enrichment ---
export async function processEnrichment(lead: Lead): Promise<Partial<Lead>> {
    let websiteUrl = lead.website;
    let searchContext = '';
    let scrapedText = '';

    // 1. Scrape the official website using the Jina API
    if (websiteUrl) {
        scrapedText = await scrapeWebsiteWithAPI(websiteUrl as string);
    }

    // 2. Google Search Fallback & Cross-Reference
    const searchResults = await searchGoogle(`"${lead.business_name}" ${lead.address} LinkedIn OR Facebook OR Instagram OR official website`);

    if (searchResults.length > 0) {
        for (const item of searchResults) {
            // If we don't have a website yet, or we want to double check the main site
            if (!websiteUrl && !item.link.includes('linkedin.com') && !item.link.includes('facebook.com') && !item.link.includes('instagram.com') && !item.link.includes('google.com')) {
                websiteUrl = item.link;
                scrapedText = await scrapeWebsiteWithAPI(websiteUrl as string);
            }
        }
        searchContext = searchResults.map((item: any) => `${item.title}: ${item.snippet} (${item.link})`).join('\n');
    }

    // 3. Prepare Gemini Prompt (UPGRADED WITH CLASSIFICATION & SOCIAL HUNTER)
    const prompt = `
    You are an expert lead generation data analyst. Your job is to extract decision-maker contact info, find social profiles, and flag "bad" leads.
    
    Business Name: ${lead.business_name}
    Address: ${lead.address}
    Provided Phone: ${lead.phone || 'N/A'}
    Website: ${websiteUrl || 'N/A'}
    
    --- Official Website Content (Jina AI Extraction - Markdown Format) ---
    ${scrapedText || 'No website content could be scraped.'}
    
    --- Google Search Snippets (FOR CROSS-REFERENCING) ---
    ${searchContext || 'No search context found.'}
    
    CRITICAL INSTRUCTIONS:
    1. Scan the Website Content (which includes markdown links) and the Google Search snippets to build a complete list of social profiles.
    2. Look for explicit emails, owner names, or management team members. Do not guess emails.
    3. Categorize the lead. If this looks like a residential home, an apartment complex, a permanently closed business, or completely unrelated to commercial business, set the "lead_quality" to "bad" and explain why in the summary.
    
    Task: Extract the following information as STRICT JSON without markdown fences or extra text:
    {
      "lead_quality": "good" or "bad",
      "decision_maker_name": "Name of CEO/Owner/Manager if found, else null",
      "decision_maker_role": "Role (e.g., Owner, CEO) if found, else null",
      "contact_email": "Best contact email if found, else null",
      "social_profiles": { "linkedin": "url", "facebook": "url", "instagram": "url", "twitter": "url", "youtube": "url", "tiktok": "url", "yelp": "url" } or null,
      "enrichment_summary": "A 1-2 sentence summary of what this business does and who the key contact is. If lead_quality is bad, explain why."
    }
  `;

    // 4. Call Gemini
    try {
        const rawResult = await callGeminiWithBackoff(prompt);
        let parsedData: any = {};

        try {
            parsedData = JSON.parse(rawResult);
        } catch (e) {
            console.error("Failed to parse JSON directly. Raw result:", rawResult);
            // If responseMimeType is set, this catch block should ideally not be hit with malformed JSON.
            // However, as a safeguard, we can log the error and re-throw or return a default.
            // The previous manual cleanup for markdown fences is removed as it's no longer needed
            // with responseMimeType: "application/json".
            throw new Error(`Failed to parse Gemini response as JSON: ${e}`);
        }

        let existingProfiles: Record<string, string> = {};
        if (lead.social_profiles) {
            existingProfiles = typeof lead.social_profiles === 'string'
                ? JSON.parse(lead.social_profiles)
                : lead.social_profiles;
        }

        const newProfiles = parsedData.social_profiles || {};
        const mergedProfiles = { ...existingProfiles, ...newProfiles };

        // If the AI flags it as a "bad" lead (e.g., residential house), we change the status
        const finalStatus = parsedData.lead_quality === 'bad' ? 'failed' : 'verified';

        return {
            website: websiteUrl,
            status: finalStatus,
            decision_maker_name: parsedData.decision_maker_name || null,
            decision_maker_role: parsedData.decision_maker_role || null,
            contact_email: parsedData.contact_email || null,
            social_profiles: Object.keys(mergedProfiles).length > 0 ? mergedProfiles : null,
            enrichment_summary: parsedData.enrichment_summary || null,
        };
    } catch (error) {
        console.error('Gemini Enrichment Error:', error);
        return {
            website: websiteUrl,
            status: 'failed',
            enrichment_summary: 'Failed to extract AI data.',
        };
    }
}

// Added to fix missing import in route.ts
export async function fastExtractSocials(url: string): Promise<{ profiles: Record<string, string>, email: string | null } | null> {
    // Placeholder implementation
    return null;
}
