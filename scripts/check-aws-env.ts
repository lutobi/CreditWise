
import dotenv from 'dotenv';
import path from 'path';

// Load from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('--- AWS Config Check ---');
const keys = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];

keys.forEach(key => {
    if (process.env[key]) {
        console.log(`✅ ${key} is set.`);
    } else {
        console.log(`❌ ${key} is MISSING.`);
    }
});
