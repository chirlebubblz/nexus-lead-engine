import pLimit from 'p-limit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Lead } from '@/types';

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

// FORCE Native JSON Mode so we never have parsing crashes
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: "application/json" }
});

// Helper for exponential backoff on Gemini API calls
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

// UPGRADED SCRAPER: Uses Jina.ai to render JavaScript sites (Wix/React)
// Returns clean markdown containing all text and links.
async function scrapeWebsiteWithJina(url: string): Promise<string> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // Give it slightly longer to render JS

        // The 'r.jina.ai/' prefix automatically converts the target URL into clean Markdown
        const res = await fetch(`https://r.jina.ai/${url}`, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'X-Return-Format': 'markdown'
            }
        });
        clearTimeout(timeoutId);

        if (!res.ok) return '';

        const data = await res.json();
        const markdownText = data.data?.content || '';

        // Truncate to 10000 characters to save Gemini tokens while retaining core data
        return markdownText.substring(0, 10000);
    } catch (error) {
        console.error(`Failed to scrape ${url} with Jina:`, (error as Error).message);
        return '';
    }
}

export async function processEnrichment(lead: Lead): Promise<Partial<Lead>> {
    let websiteUrl = lead.website;
    let searchContext = '';
    let scrapedText = '';

    // 1. Scrape the official website using the new JS-rendering engine
    if (websiteUrl) {
        scrapedText = await scrapeWebsiteWithJina(websiteUrl as string);
    }

    // 2. Perform a targeted Google Search
    const searchResults = await searchGoogle(`"${lead.business_name}" ${lead.address} LinkedIn OR Facebook OR Instagram OR official website`);

    if (searchResults.length > 0) {
        for (const item of searchResults) {
            // If no website was found originally, find it via Google and scrape it
            if (!websiteUrl && !item.link.includes('linkedin.com') && !item.link.includes('facebook.com') && !item.link.includes('instagram.com') && !item.link.includes('google.com')) {
                websiteUrl = item.link;
                scrapedText = await scrapeWebsiteWithJina(websiteUrl as string);
            }
        }
        searchContext = searchResults.map((item: any) => `${item.title}: ${item.snippet} (${item.link})`).join('\n');
    }

    // 3. Prepare Gemini Prompt (Simplified because JSON mode is forced)
    const prompt = `
    You are an expert lead enrichment AI. Your job is to extract decision maker names, roles, emails, and social profiles for a business.
    CRITICAL INSTRUCTION: Analyze the Official Website Markdown first. Look carefully for any Markdown links pointing to social media. Then cross-reference with the Google Search Snippets.
    
    Business Name: ${lead.business_name}
    Address: ${lead.address}
    Provided Phone: ${lead.phone || 'N/A'}
    Website: ${websiteUrl || 'N/A'}
    
    --- Official Website Content (Markdown) ---
    ${scrapedText || 'No website content could be scraped.'}
    
    --- Google Search Snippets ---
    ${searchContext || 'No search context found.'}
    
    Task: Output a valid JSON object matching exactly this schema:
    {
      "decision_maker_name": "Name of CEO/Owner/Manager if found, else null",
      "decision_maker_role": "Role (e.g., Owner, CEO) if found, else null",
      "contact_email": "Best contact email if found (do not guess), else null",
      "social_profiles": { "linkedin": "url", "facebook": "url", "instagram": "url", "twitter": "url", "youtube": "url", "tiktok": "url", "yelp": "url" } or null if none,
      "enrichment_summary": "A 1-2 sentence summary of what this business does and who the key contact is."
    }
    `;

    // 4. Call Gemini
    try {
        const rawResult = await callGeminiWithBackoff(prompt);
        // We can confidently run JSON.parse now because responseMimeType guarantees JSON format
        const parsedData = JSON.parse(rawResult);

        let existingProfiles: Record<string, string> = {};
        if (lead.social_profiles) {
            existingProfiles = typeof lead.social_profiles === 'string'
                ? JSON.parse(lead.social_profiles)
                : lead.social_profiles;
        }

        const newProfiles = parsedData.social_profiles || {};
        const mergedProfiles = { ...existingProfiles, ...newProfiles };

        return {
            website: websiteUrl,
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
            enrichment_summary: 'Failed to extract AI data.',
        };
    }
}

// Added to fix missing import in route.ts
export async function fastExtractSocials(url: string): Promise<{ profiles: Record<string, string>, email: string | null } | null> {
    // Placeholder implementation
    return null;
}
