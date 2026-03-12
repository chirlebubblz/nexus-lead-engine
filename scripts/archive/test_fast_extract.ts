const fetchUrl = async (url: string) => {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const html = await response.text();
        console.log(`URL: ${url} - HTML Length: ${html.length}`);

        const extractMatch = (regex: RegExp) => {
            const match = html.match(regex);
            return match ? match[1] || match[0] : null;
        };
        console.log("FB:", extractMatch(/(https?:\/\/(?:www\.)?facebook\.com\/[^"'\s<]+)/i));
        console.log("IG:", extractMatch(/(https?:\/\/(?:www\.)?instagram\.com\/[^"'\s<]+)/i));
        console.log("LI:", extractMatch(/(https?:\/\/(?:www\.)?(?:linkedin\.com)\/(?:company|in)\/[^"'\s<]+)/i));
    } catch (e) { console.error(e) }
}

async function run() {
    await fetchUrl('https://vercel.com');
    await fetchUrl('https://solarclean.com');
}
run();
