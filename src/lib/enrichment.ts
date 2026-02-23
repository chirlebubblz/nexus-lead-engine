import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Lead } from '@/types';

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function fastExtractSocials(url: string): Promise<{ profiles: Record<string, string>, email: string | null } | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s fast timeout

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });
        clearTimeout(timeoutId);

        if (!res.ok) return null;
        const html = await res.text();
        const socialRegex = /(https?:\/\/(?:www\.)?(?:instagram\.com|facebook\.com|linkedin\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|yelp\.com)[^\s"'<>\\)\]]*)/ig;
        const matches = html.match(socialRegex) || [];

        const extracted: Record<string, string> = {};
        matches.forEach(match => {
            const cleanUrl = match.replace(/[\.,;\\]$/, '').split('?')[0];
            const lowerUrl = cleanUrl.toLowerCase();
            if (lowerUrl.includes('instagram.com') && !extracted.instagram) extracted.instagram = cleanUrl;
            else if (lowerUrl.includes('facebook.com') && !extracted.facebook) extracted.facebook = cleanUrl;
            else if (lowerUrl.includes('linkedin.com') && !extracted.linkedin) extracted.linkedin = cleanUrl;
            else if (lowerUrl.includes('twitter.com') && !extracted.twitter) extracted.twitter = cleanUrl;
            else if (lowerUrl.includes('x.com') && !extracted.twitter) extracted.twitter = cleanUrl;
            else if (lowerUrl.includes('tiktok.com') && !extracted.tiktok) extracted.tiktok = cleanUrl;
            else if (lowerUrl.includes('youtube.com') && !extracted.youtube) extracted.youtube = cleanUrl;
            else if (lowerUrl.includes('yelp.com') && !extracted.yelp) extracted.yelp = cleanUrl;
        });

        // Attempt to find an explicit mailto link for high confidence email matches
        const emailRegex = /href=["']mailto:([^"'?]+)(?:\?.*)?["']/i;
        const emailMatch = html.match(emailRegex);
        const email = emailMatch && emailMatch[1] ? emailMatch[1].trim() : null;

        return {
            profiles: Object.keys(extracted).length > 0 ? extracted : {},
            email: email
        };
    } catch (e) {
        return null; // Fail silently for this fast pass
    }
}

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
                delay *= 2; // Exponential backoff
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

async function verifySocialLink(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // Some social networks block HEAD, so we use GET but abort early or just accept the initial status
        const res = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        clearTimeout(timeoutId);

        // 404 means the profile is dead/fake. Some networks might return 403 or 429 if scraping is blocked, 
        // in which case it's safer to assume the link is valid rather than discarding a good link.
        if (res.status === 404) {
            return false;
        }
        return true;
    } catch (e) {
        // If it times out or fails (e.g. LinkedIn strictly blocks fetches), assume true to avoid false negatives
        return true;
    }
}

async function scrapeWebsite(url: string): Promise<string> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s because Jina boots a browser

        // Prefix target URL with Jina Reader API
        const jinaUrl = `https://r.jina.ai/${url}`;

        const res = await fetch(jinaUrl, {
            signal: controller.signal,
            headers: {
                'Accept': 'text/plain',
                'X-Return-Format': 'markdown', // Jina returns highly optimized markdown for LLMs
                'User-Agent': 'NexusLeadEngine/1.0'
            }
        });
        clearTimeout(timeoutId);

        if (!res.ok) return '';
        const markdown = await res.text();
        const socialLinks = new Set<string>();

        // 1. EXTRACT SOCIAL LINKS VIA REGEX FROM JINA MARKDOWN
        // Since Jina renders Javascript, it catches links embedded in React widgets
        // and returns them formatted as standard [text](url) markdown. 
        const socialRegex = /(https?:\/\/(?:www\.)?(?:instagram\.com|facebook\.com|linkedin\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|yelp\.com)[^\s"'<>\\)\]]*)/ig;
        const matches = markdown.match(socialRegex) || [];

        matches.forEach(url => {
            // Clean up any trailing punctuation that regex might have grabbed
            const cleanUrl = url.replace(/[\.,;\\]$/, '').split('?')[0];
            socialLinks.add(cleanUrl);
        });

        // 2. COMBINE TEXT AND LINKS FOR GEMINI
        return `
Website Text (Markdown):
${markdown.substring(0, 10000)}

Found Social URLs in Website Code:
${Array.from(socialLinks).join('\n')}
        `.trim();

    } catch (error) {
        console.error(`Failed to scrape ${url} via Jina:`, (error as Error).message);
        return '';
    }
}

export async function processEnrichment(lead: Lead): Promise<Partial<Lead>> {
    let websiteUrl = lead.website;
    let searchContext = '';
    let scrapedText = '';

    // 1. Scrape the official website FIRST if we already have it from Google Places
    if (websiteUrl) {
        scrapedText = await scrapeWebsite(websiteUrl as string);
    }

    // 2. Perform a targeted Google Search to hunt down social media profiles and extra context
    // We search for the business name, address, and keywords for major social platforms.
    const searchResults = await searchGoogle(`"${lead.business_name}" ${lead.address} LinkedIn OR Facebook OR Instagram OR official website`);

    if (searchResults.length > 0) {
        for (const item of searchResults) {
            // If we didn't have a website originally, grab the most likely official site and scrape it now
            if (!websiteUrl && !item.link.includes('linkedin.com') && !item.link.includes('facebook.com') && !item.link.includes('instagram.com') && !item.link.includes('google.com')) {
                websiteUrl = item.link;
                scrapedText = await scrapeWebsite(websiteUrl as string);
            }
        }
        searchContext = searchResults.map((item: any) => `${item.title}: ${item.snippet} (${item.link})`).join('\n');
    }

    // 3. Prepare Gemini Prompt
    const prompt = `
    You are an expert lead enrichment AI. Your job is to extract decision maker names, roles, emails, and social profiles for a business.
    CRITICAL INSTRUCTION: Analyze the Official Website Text first. IF social media links were extracted from the website (in the snippet), YOU MUST INCLUDE THEM in the social_profiles JSON output. Then cross-reference with the Google Search Snippets to find any additional social profiles (LinkedIn, Facebook, Instagram, Twitter/X, etc.).
    
    Business Name: ${lead.business_name}
    Address: ${lead.address}
    Provided Phone: ${lead.phone || 'N/A'}
    Website: ${websiteUrl || 'N/A'}
    
    --- Official Website Text Snippet (PRIMARY SOURCE) ---
    ${scrapedText || 'No website content could be scraped.'}
    
    --- Google Search Snippets (FOR ADDITIONAL SOCIAL MEDIA & VERIFICATION) ---
    ${searchContext || 'No search context found.'}
    
    Task: Extract the following information as strictly formatted JSON without markdown fences or extra text:
    {
      "decision_maker_name": "Name of CEO/Owner/Manager if found, else null",
      "decision_maker_role": "Role (e.g., Owner, CEO) if found, else null",
      "contact_email": "Best contact email if found (do not guess), else null",
      "social_profiles": { "linkedin": "url", "facebook": "url", "instagram": "url", "twitter": "url", "youtube": "url", "tiktok": "url", "yelp": "url" } or null if none,
      "enrichment_summary": "A 1-2 sentence summary of what this business does and who the key contact is."
    }
  `;

    // 4. Call Gemini with Exponential Backoff
    try {
        const rawResult = await callGeminiWithBackoff(prompt);
        // Cleanup potential markdown formatting
        let cleanedJson = rawResult.trim();
        if (cleanedJson.startsWith('\`\`\`json')) {
            cleanedJson = cleanedJson.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        } else if (cleanedJson.startsWith('\`\`\`')) {
            cleanedJson = cleanedJson.replace(/\`\`\`/g, '').trim();
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
        // Fallback if AI fails but we found a website
        return {
            website: websiteUrl,
            enrichment_summary: 'Failed to extract AI data.',
        };
    }
}
