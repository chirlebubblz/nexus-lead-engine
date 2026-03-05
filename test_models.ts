import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function run() {
    try {
        console.log("Listing models...");
        // the Node SDK doesn't natively expose listModels easily through genAI object
        // we can fetch manually
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await res.json();
        console.log(JSON.stringify(data.models.map((m: any) => m.name), null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
