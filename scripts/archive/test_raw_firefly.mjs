async function testRawFetch() {
    const targetUrl = 'https://www.fireflysf.com';

    console.log(`Fetching RAW from: ${targetUrl}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const res = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });
        clearTimeout(timeoutId);

        const html = await res.text();

        const socialRegex = /(https?:\/\/(?:www\.)?(?:instagram\.com|facebook\.com|linkedin\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|yelp\.com)[^\s"'<>\\)\]]*)/ig;
        const matches = html.match(socialRegex) || [];
        console.log("\n--- RAW HTML REGEX MATCHES ---", matches);
    } catch (e) {
        console.error(e);
    }
}
testRawFetch();
