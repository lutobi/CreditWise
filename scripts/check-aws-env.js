
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Checking ' + envPath);

if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local not found');
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
const keys = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];

keys.forEach(key => {
    // Check if key exists and has a value (not empty)
    // Regex: Start of line or newline, key, optional whitespace, =, optional whitespace, value (not just whitespace)
    const regex = new RegExp(`(?:^|\\n)\\s*${key}\\s*=\\s*([^\\s]+)`, 'g');
    const match = regex.exec(content);
    if (match && match[1]) {
        console.log(`✅ ${key} is set.`);
    } else {
        console.log(`❌ ${key} is MISSING or EMPTY.`);
    }
});
