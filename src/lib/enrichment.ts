import { GoogleGenerativeAI } from '@google/generative-ai';
import { Lead } from '@/types';

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

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
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CX) return [];
    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        return data.items || [];
    } catch (error) {
        return [];
    }
}

// --- HELPER: Jina AI Web Scraper (For Main Text & Emails) ---
async function scrapeWebsiteWithAPI(url: string): Promise<string> {
    try {
        const response = await fetch(`https://r.jina.ai/${url}`, {
            headers: {
                'Accept': 'text/plain',
                'X-Return-Format': 'markdown'
            }
        });
        if (!response.ok) return '';
        const markdown = await response.text();
        return markdown.substring(0, 15000);
    } catch (error) {
        return '';
    }
}

// --- HELPER: Raw Social Media Scanner (Bypasses Jina's Footer Deletion) ---
async function extractRawSocials(url: string): Promise<string[]> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        clearTimeout(timeoutId);

        if (!res.ok) return [];
        const html = await res.text();

        const socials = new Set<string>();
        // Hunts specifically for social URLs in the raw HTML
        const regex = /href=["'](https?:\/\/(www\.)?(facebook|linkedin|instagram|twitter|x|youtube|tiktok|yelp)\.com\/[^"']+)["']/gi;
        let match;
        while ((match = regex.exec(html)) !== null) {
            let cleanUrl = match[1].split('?')[0].replace(/\/$/, '');
            if (!cleanUrl.includes('/share') && !cleanUrl.includes('/intent')) {
                socials.add(cleanUrl);
            }
        }
        return Array.from(socials);
    } catch (error) {
        return [];
    }
}

// --- MAIN ENGINE: Process Enrichment ---
export async function processEnrichment(lead: Lead, criteria?: { description: string, target: string }): Promise<Partial<Lead>> {
    let websiteUrl = lead.website;
    let searchContext = '';
    let scrapedText = '';
    let rawSocialLinks: string[] = [];

    // 1. Scrape the official website using Jina (Text) AND Raw Fetch (Socials)
    if (websiteUrl) {
        // Run both scanners at the same time for speed
        const [jinaResult, socialResult] = await Promise.all([
            scrapeWebsiteWithAPI(websiteUrl as string),
            extractRawSocials(websiteUrl as string)
        ]);
        scrapedText = jinaResult;
        rawSocialLinks = socialResult;
    }

    // 2. Google Search Fallback & Cross-Reference
    const searchResults = await searchGoogle(`"${lead.business_name}" ${lead.address} LinkedIn OR Facebook OR Instagram OR official website`);

    if (searchResults.length > 0) {
        for (const item of searchResults) {
            if (!websiteUrl && !item.link.includes('linkedin.com') && !item.link.includes('facebook.com') && !item.link.includes('instagram.com') && !item.link.includes('google.com')) {
                websiteUrl = item.link;
                const [jinaResult, socialResult] = await Promise.all([
                    scrapeWebsiteWithAPI(websiteUrl as string),
                    extractRawSocials(websiteUrl as string)
                ]);
                scrapedText = jinaResult;
                rawSocialLinks = socialResult;
            }
        }
        searchContext = searchResults.map((item: any) => `${item.title}: ${item.snippet} (${item.link})`).join('\n');
    }

    const formattedSocials = rawSocialLinks.length > 0
        ? `\n--- Social Links Found Hidden in Website Footer ---\n${rawSocialLinks.join('\n')}`
        : '';

    const targetDesc = criteria?.description || 'business';
    const targetFocus = criteria?.target || 'any';

    // 3. Prepare Gemini Prompt 
    const prompt = `
    You are an expert lead generation data analyst. Your job is to extract decision-maker contact info, find social profiles, and flag "bad" leads.
    
    Business Name: ${lead.business_name}
    Address: ${lead.address}
    Provided Phone: ${lead.phone || 'N/A'}
    Website: ${websiteUrl || 'N/A'}
    
    --- Official Website Content (Jina AI Extraction) ---
    ${scrapedText || 'No website content could be scraped.'}
    ${formattedSocials}
    
    --- Google Search Snippets (FOR CROSS-REFERENCING) ---
    ${searchContext || 'No search context found.'}
    
    CRITICAL INSTRUCTIONS:
    1. Scan the "Social Links Found Hidden in Website Footer" and the Google Search snippets to build a complete list of social profiles.
    2. Look for explicit emails, owner names, or management team members. Do not guess emails.
    3. CATEGORIZATION RULES: You are looking specifically for a "${targetDesc}". The target market focus must be "${targetFocus}". 
       - If the target market is "Commercial/B2B" and this business strictly serves "Residential/Consumers" (or vice versa), set the "lead_quality" to "bad" and explain why.
       - If it is a permanently closed business, or completely unrelated to a "${targetDesc}", set the "lead_quality" to "bad".
       - Otherwise, set it to "good".
    
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
        let cleanedJson = rawResult.trim();
        if (cleanedJson.startsWith('```json')) {
            cleanedJson = cleanedJson.replace(/```json/g, '').replace(/```/g, '').trim();
        } else if (cleanedJson.startsWith('```')) {
            cleanedJson = cleanedJson.replace(/```/g, '').trim();
        }

        const parsedData = JSON.parse(cleanedJson);

        let existingProfiles: Record<string, string> = {};
        if (lead.social_profiles) {
            existingProfiles = typeof lead.social_profiles === 'string'
                ? JSON.parse(lead.social_profiles)
                : lead.social_profiles;
        }

        const newProfiles = parsedData.social_profiles || {};
        const mergedProfiles = { ...existingProfiles, ...newProfiles };

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

// Bare-metal fast extraction logic expected by API routes
export async function fastExtractSocials(url: string): Promise<{ profiles: Record<string, string>, email: string | null } | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        clearTimeout(timeoutId);

        if (!response.ok) return null;

        const html = await response.text(); // Scan full HTML

        const profiles: Record<string, string> = {};
        let email: string | null = null;

        const extractMatch = (regex: RegExp) => {
            const match = html.match(regex);
            return match ? match[1] || match[0] : null;
        };

        const fb = extractMatch(/(https?:\/\/(?:www\.)?facebook\.com\/[^"'\s<]+)/i);
        if (fb) profiles.facebook = fb;

        const ig = extractMatch(/(https?:\/\/(?:www\.)?instagram\.com\/[^"'\s<]+)/i);
        if (ig) profiles.instagram = ig;

        const li = extractMatch(/(https?:\/\/(?:www\.)?(?:linkedin\.com)\/(?:company|in)\/[^"'\s<]+)/i);
        if (li) profiles.linkedin = li;

        const yelp = extractMatch(/(https?:\/\/(?:www\.)?yelp\.com\/biz\/[^"'\s<]+)/i);
        if (yelp) profiles.yelp = yelp;

        const emailMatch = html.match(/mailto:([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4})/i);
        if (emailMatch) email = emailMatch[1];

        return { profiles, email };
    } catch (e) {
        return null;
    }
}
