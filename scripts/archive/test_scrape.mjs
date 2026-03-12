import * as cheerio from 'cheerio';

const url = 'https://www.gastroboteats.com';
const socialRegex = /(https?:\/\/(?:www\.)?(?:instagram\.com|facebook\.com|linkedin\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|yelp\.com)[^\s"'<>\\)]*)/ig;

async function run() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
        signal: controller.signal,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }
    });
    clearTimeout(timeoutId);

    console.log("Status:", res.status);
    const html = await res.text();
    const socialLinks = new Set();
    const matches = html.match(socialRegex) || [];
    matches.forEach(url => {
        const cleanUrl = url.replace(/[\.,;\\]$/, '').split('?')[0];
        socialLinks.add(cleanUrl);
    });

    const $ = cheerio.load(html);
    $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && socialRegex.test(href)) {
            socialLinks.add(href.split('?')[0]);
        }
    });

    console.log("Found SM Links:", [...socialLinks]);
}
run();
