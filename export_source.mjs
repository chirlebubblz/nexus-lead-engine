import fs from 'fs';
import path from 'path';

const outputFile = 'nexus_source_code_export.txt';
const directoriesToScan = ['src'];
const explicitFiles = ['package.json', 'next.config.ts', 'tsconfig.json', 'tailwind.config.ts'];
const allowedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json'];

let outputContent = '# Nexus Lead Engine - Source Code Export\n\n';

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
        } else {
            if (allowedExtensions.includes(path.extname(fullPath))) {
                appendFileToOutput(fullPath);
            }
        }
    }
}

function appendFileToOutput(filePath) {
    if (!fs.existsSync(filePath)) return;
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        outputContent += `\n\n================================================================================\n`;
        outputContent += `FILE: ${filePath.replace(/\\/g, '/')}\n`;
        outputContent += `================================================================================\n\n`;
        outputContent += content;
    } catch (e) {
        console.error(`Failed to read ${filePath}`);
    }
}

// Do the work
explicitFiles.forEach(appendFileToOutput);
directoriesToScan.forEach(dir => {
    if (fs.existsSync(dir)) scanDir(dir);
});

fs.writeFileSync(outputFile, outputContent);
console.log(`Source code successfully exported to ${outputFile}`);
