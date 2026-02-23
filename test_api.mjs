async function testAPI() {
    try {
        console.log("Pinging localhost:3000/api/search...");
        const response = await fetch("http://localhost:3000/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: "marketing agency",
                latitude: 37.7749,
                longitude: -122.4194,
                radius: 5000
            })
        });
        const text = await response.text();
        console.log("Status:", response.status);
        console.log("Body:", text);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}
testAPI();
