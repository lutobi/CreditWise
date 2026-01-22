
import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function deploy() {
    // 1. Get Connection String
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

    if (!connectionString) {
        console.error("❌ No database connection string found in .env.local");
        console.error("   Ensure DATABASE_URL is set (e.g. postgres://postgres:[password]@db...supabase.co:5432/postgres)");
        process.exit(1);
    }

    // 2. Connect
    console.log("Connecting to database...");
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log("Connected.");

        // 3. Read SQL
        const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260111_user_profile_update.sql');
        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found at: ${migrationPath}`);
        }
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // 4. Execute
        console.log("Executing migration (Adding address & NoK columns)...");
        await client.query(sql);
        console.log("✅ Successfully applied profile updates!");

    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

deploy();
