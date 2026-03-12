async function testJina() {
    const targetUrl = 'https://www.fireflysf.com';
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;

    console.log(`Fetching from: ${jinaUrl}`);
    const res = await fetch(jinaUrl, {
        headers: {
            'Accept': 'text/plain',
            'X-Return-Format': 'markdown'
        }
    });

    const text = await res.text();
    console.log("--- INITIAL PAYLOAD LENGTH ---", text.length);
    console.log("--- SEARCHING PAYLOAD FOR 'facebook' ---");
    const facebookIndex = text.toLowerCase().indexOf('facebook');
    if (facebookIndex !== -1) {
        console.log(text.substring(Math.max(0, facebookIndex - 100), Math.min(text.length, facebookIndex + 100)));
    } else {
        console.log("NO FACEBOOK TEXT FOUND IN RAW PAYLOAD");
    }

    console.log("--- SEARCHING PAYLOAD FOR 'instagram' ---");
    const instaIndex = text.toLowerCase().indexOf('instagram');
    if (instaIndex !== -1) {
        console.log(text.substring(Math.max(0, instaIndex - 100), Math.min(text.length, instaIndex + 100)));
    } else {
        console.log("NO INSTAGRAM TEXT FOUND IN RAW PAYLOAD");
    }

    // Check our regex against the markdown
    const socialRegex = /(https?:\/\/(?:www\.)?(?:instagram\.com|facebook\.com|linkedin\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|yelp\.com)[^\s"'<>\\)\]]*)/ig;
    const matches = text.match(socialRegex) || [];
    console.log("\n--- REGEX MATCHES ---", matches);
}
testJina();
