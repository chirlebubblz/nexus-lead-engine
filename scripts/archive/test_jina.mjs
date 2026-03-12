async function testJina() {
    const targetUrl = 'https://www.gastroboteats.com';
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;

    console.log(`Fetching from: ${jinaUrl}`);
    const res = await fetch(jinaUrl, {
        headers: {
            'Accept': 'text/plain',
            'X-Return-Format': 'markdown'
        }
    });

    const text = await res.text();
    console.log("--- JINA OUTPUT ---");
    console.log(text.substring(0, 1500));

    // Check our regex against the markdown
    const socialRegex = /(https?:\/\/(?:www\.)?(?:instagram\.com|facebook\.com|linkedin\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|yelp\.com)[^\s"'<>\\)\]]*)/ig;
    const matches = text.match(socialRegex) || [];
    console.log("\n--- REGEX MATCHES ---", matches);
}
testJina();
