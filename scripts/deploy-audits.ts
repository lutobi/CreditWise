
import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function deploy() {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

    if (!connectionString) {
        console.error("❌ No database connection string found in .env.local (DATABASE_URL, POSTGRES_URL, or SUPABASE_DB_URL)");
        process.exit(1);
    }

    console.log("Connecting to database...");
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log("Connected.");

        const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', 'audits.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Executing migration...");
        await client.query(sql);
        console.log("✅ Successfully deployed audit_logs table!");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await client.end();
    }
}

deploy();
