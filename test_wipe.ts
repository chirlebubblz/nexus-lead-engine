import { deleteAllLeads } from './src/lib/leads';

async function testWipe() {
    console.log("Attempting to wipe leads...");
    await deleteAllLeads();
    console.log("Wipe attempt finished.");
}

testWipe();
