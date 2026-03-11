import { GoogleGenerativeAI } from '@google/generative-ai';
import { Lead } from '@/types';

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY; // Add to your .env file

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function callGeminiWithBackoff(prompt: string, maxRetries = 3): Promise<string> {
    let attempt = 0;
    let delay = 4000; // FREE TIER: Starts with a much longer 4-second delay if rate limited

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
    throw new Error('Gemini API blocked the request (Max retries exceeded).');
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
        // Calling our local Python Scrapling Microservice
        const response = await fetch(`http://127.0.0.1:8000/api/scrape`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        if (!response.ok) {
            console.warn(`Scrapling API failed to fetch ${url}`);
            return '';
        }
        
        const data = await response.json();
        return data.text || '';
    } catch (error) {
        console.warn("Local Scrapling microservice is not running or failed.", error);
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
// --- PRONG 2: The SERP Agent ---
async function sweepManagementSocials(personName: string, companyName: string) {
    if (!SERPER_API_KEY) return null;
    
    console.log(`Agent 2: Sweeping LinkedIn for ${personName}...`);
    
    try {
        const response = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
                "X-API-KEY": SERPER_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                q: `"${personName}" "${companyName}" site:linkedin.com/in/`,
                num: 1
            })
        });
        
        const data = await response.json();
        
        if (data.organic && data.organic.length > 0) {
            return {
                url: data.organic[0].link,
                snippet: data.organic[0].snippet
            };
        }
        return null;
    } catch (error) {
        console.warn(`SERP sweep failed for ${personName}:`, error);
        return null;
    }
}

// --- MAIN ENRICHMENT FLOW (Combines Prong 1 & Prong 2) ---
export async function processEnrichment(lead: Lead): Promise<Partial<Lead>> {
    let websiteUrl = lead.website;
    let searchContext = '';
    let scrapedText = '';
    let rawSocialLinks: string[] = [];

    if (websiteUrl) {
        // PRONG 1: extractRawSocials grabs the company footer links concurrently with the Scrapling sweep
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

    // PRONG 1: Formatting the footer socials to feed to Gemini
    const formattedSocials = rawSocialLinks.length > 0
        ? `\n--- Social Links Found Hidden in Website Footer ---\n${rawSocialLinks.join('\n')}`
        : '';

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

        const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("AI did not return valid JSON. The website might be blocking scrapers.");
        }

        const parsedData = JSON.parse(jsonMatch[0]);

        // PRONG 1: Merge the company socials Gemini parsed with any existing lead data
        let existingProfiles: Record<string, string> = {};
        if (lead.social_profiles) existingProfiles = typeof lead.social_profiles === 'string' ? JSON.parse(lead.social_profiles) : lead.social_profiles;
        const mergedProfiles = { ...existingProfiles, ...(parsedData.social_profiles || {}) };

        let team = parsedData.management_team || [];
        
        // --- PRONG 2: The SERP Agent Deep Dive ---
        team = await Promise.all(team.map(async (member: any) => {
            if (member.name && member.name.toLowerCase() !== "unknown") {
                const linkedinData = await sweepManagementSocials(member.name, lead.business_name);
                if (linkedinData) {
                    member.linkedin_url = linkedinData.url;
                    member.bio_snippet = linkedinData.snippet;
                }
            }
            return member;
        }));

        const allNames = team.map((t: any) => t.name).filter(Boolean).join(', ');
        const allRoles = team.map((t: any) => t.role).filter(Boolean).join(', ');
        const allEmails = team.map((t: any) => t.email).filter(Boolean).join(', ');
        
        // Format the deep-sweep data for the UI
        const deepSocialsContext = team
            .filter((t: any) => t.linkedin_url)
            .map((t: any) => `${t.name} (${t.role}): ${t.linkedin_url}\nBio: ${t.bio_snippet}`)
            .join('\n\n');

        return {
            website: websiteUrl,
            status: 'verified',
            decision_maker_name: allNames || null,
            decision_maker_role: allRoles || null,
            contact_email: allEmails || null,
            social_profiles: Object.keys(mergedProfiles).length > 0 ? mergedProfiles : null,
            // Appending the specific management LinkedIn profiles for the call setters
            enrichment_summary: deepSocialsContext 
                ? `${parsedData.enrichment_summary}\n\n--- Management LinkedIn Profiles ---\n${deepSocialsContext}`
                : parsedData.enrichment_summary || null,
        };
    } catch (error: any) {
        console.error('Gemini Enrichment Error:', error);

        let errorMessage = 'Failed to extract data.';
        if (error instanceof SyntaxError) {
            errorMessage = 'Failed to parse AI response. The website is likely blank or protected by Cloudflare.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            website: websiteUrl,
            status: 'failed',
            enrichment_summary: errorMessage,
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
