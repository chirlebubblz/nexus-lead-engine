import { GoogleGenerativeAI } from '@google/generative-ai';
import { Lead } from '@/types';

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

async function callGeminiWithBackoff(prompt: string, maxRetries = 3): Promise<string> {
    let attempt = 0;
    let delay = 2000;

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

export async function processEnrichment(lead: Lead): Promise<Partial<Lead>> {
    let websiteUrl = lead.website;
    let searchContext = '';
    let scrapedText = '';
    let rawSocialLinks: string[] = [];

    if (websiteUrl) {
        const [jinaResult, socialResult] = await Promise.all([
            scrapeWebsiteWithAPI(websiteUrl as string),
            extractRawSocials(websiteUrl as string)
        ]);
        scrapedText = jinaResult;
        rawSocialLinks = socialResult;
    }

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

    // PROMPT UPDATED TO GRAB MULTIPLE CONTACTS
    const prompt = `
    You are an expert data analyst. Your sole job is to extract contact info, social profiles, and write a summary. DO NOT filter or judge the lead.

    Business Name: ${lead.business_name}
    Address: ${lead.address}
    Website: ${websiteUrl || 'N/A'}
    
    --- Official Website Content ---
    ${scrapedText || 'No website content could be scraped.'}
    ${formattedSocials}
    
    CRITICAL INSTRUCTIONS:
    1. Scan the text to find ALL management team members, owners, and executives.
    2. Extract their names, roles, and explicit email addresses. Add them all to the "management_team" array.
    3. Write a 1-2 sentence summary of what the business does.
    
    Task: Extract the following information as STRICT JSON without markdown fences or extra text:
    {
      "management_team": [
        {
          "name": "Name of CEO/Owner/Manager",
          "role": "Role (e.g., President, Manager)",
          "email": "Direct contact email"
        }
      ],
      "social_profiles": { "linkedin": "url", "facebook": "url", "instagram": "url", "twitter": "url" } or null,
      "enrichment_summary": "A 1-2 sentence summary of what this business does."
    }
  `;

    try {
        const rawResult = await callGeminiWithBackoff(prompt);
        let cleanedJson = rawResult.trim();
        if (cleanedJson.startsWith('```json')) cleanedJson = cleanedJson.replace(/```json/g, '').replace(/```/g, '').trim();
        else if (cleanedJson.startsWith('```')) cleanedJson = cleanedJson.replace(/```/g, '').trim();

        const parsedData = JSON.parse(cleanedJson);

        let existingProfiles: Record<string, string> = {};
        if (lead.social_profiles) existingProfiles = typeof lead.social_profiles === 'string' ? JSON.parse(lead.social_profiles) : lead.social_profiles;

        const mergedProfiles = { ...existingProfiles, ...(parsedData.social_profiles || {}) };

        // Parse the new management team array into comma-separated strings for the database
        const team = parsedData.management_team || [];
        const allNames = team.map((t: any) => t.name).filter(Boolean).join(', ');
        const allRoles = team.map((t: any) => t.role).filter(Boolean).join(', ');
        const allEmails = team.map((t: any) => t.email).filter(Boolean).join(', ');

        return {
            website: websiteUrl,
            status: 'verified',
            decision_maker_name: allNames || null,
            decision_maker_role: allRoles || null,
            contact_email: allEmails || null,
            social_profiles: Object.keys(mergedProfiles).length > 0 ? mergedProfiles : null,
            enrichment_summary: parsedData.enrichment_summary || null,
        };
    } catch (error) {
        console.error('Gemini Enrichment Error:', error);
        return {
            website: websiteUrl,
            status: 'failed',
            enrichment_summary: 'Failed to extract AI data due to Google Gemini rate limits.',
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
