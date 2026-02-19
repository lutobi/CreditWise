
import fs from 'fs';
import path from 'path';

const LOGO_PATH = '/Users/olutobi/.gemini/antigravity/brain/c1a70d0d-63da-48df-a55c-4c814cca38c1/omari_logo_purple_1769290117947.png';
const TARGET_FILE = '/Users/olutobi/.gemini/antigravity/playground/nomad-pinwheel/src/lib/pdf-generator.ts';

if (!fs.existsSync(LOGO_PATH)) {
    console.error("Logo file not found!");
    process.exit(1);
}

const logoBytes = fs.readFileSync(LOGO_PATH);
const base64 = logoBytes.toString('base64');

let content = fs.readFileSync(TARGET_FILE, 'utf8');
content = content.replace("'PLACEHOLDER_LOGO_BASE64'", `'${base64}'`);

fs.writeFileSync(TARGET_FILE, content);
console.log("Successfully injected logo base64!");
