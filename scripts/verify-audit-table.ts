
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, serviceRoleKey)

async function verifyAudits() {
    console.log("🔍 Checking audit_logs table...");

    // 1. Try to insert a dummy log
    const { data, error } = await supabase.from('audit_logs').insert({
        action: 'TEST_LOG',
        details: { message: 'Verifying table existence' },
        loan_id: null // nullable in schema? Let's check schema.sql. 
        // Wait, schema said: loan_id UUID REFERENCES loans(id). It might NOT be nullable if not specified? 
        // Schema: loan_id UUID REFERENCES loans(id) ON DELETE CASCADE
        // It didn't say NOT NULL. So it should be nullable.
    }).select().single();

    if (error) {
        console.error("❌ Insert Failed:", error.message);
        // If related to foreign key, that's fine, means table exists.
        // If "relation audit_logs does not exist", then table missing.
        return;
    }

    console.log("✅ Insert Successful:", data);

    // 2. Clean up
    const { error: deleteError } = await supabase.from('audit_logs').delete().eq('id', data.id);
    if (deleteError) console.error("⚠️ Cleanup failed:", deleteError.message);
    else console.log("✅ Cleanup Successful");
}

verifyAudits();
