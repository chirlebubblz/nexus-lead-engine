import fetch from 'node-fetch';

async function testSearch() {
    console.log("Triggering Search API...");
    const res = await fetch('http://localhost:3000/api/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: "cleaning companies",
            latitude: 32.7157,
            longitude: -117.1611, // San Diego
            radius: 5000,
            clearExisting: true
        })
    });
    const data = await res.json();
    console.log(data);
}

testSearch();
