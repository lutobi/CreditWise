
import { Client } from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: '.env.local' })

// Construct connection string usually: postgres://user:pass@host:port/db
// Supabase connection string is often in DATABASE_URL or we build it.
// .env.local usually has SUPABASE_URL and KEY. It MIGHT have DATABASE_URL for Prisma.
// Let's check environment variable existence safely.

const dbUrl = process.env.DATABASE_URL
// If no DATABASE_URL, try to construct from standard Supabase format if possible, but we need the database password.
// The user might not have provided the DB password in .env.local (often only API keys).
// If we can't connect to PG, we can't run DDL.

async function run() {
    if (!dbUrl) {
        console.error('❌ DATABASE_URL is not defined in .env.local. Cannot run DDL migration automatically.')
        console.log('Please run the contents of supabase/migrations/20260106_add_missing_columns.sql in your Supabase Dashboard SQL Editor.')
        process.exit(1)
    }

    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false } // Supabase requires SSL, usually self-signed CA or allow insecure in dev
    })

    try {
        await client.connect()
        console.log('Connected to Postgres. Running migration...')

        const sqlPath = path.join(process.cwd(), 'supabase/migrations/20260106_add_missing_columns.sql')
        const sql = fs.readFileSync(sqlPath, 'utf8')

        await client.query(sql)
        console.log('✅ Migration applied successfully.')
    } catch (err: any) {
        console.error('❌ Migration failed:', err.message)
        process.exit(1)
    } finally {
        await client.end()
    }
}

run()
