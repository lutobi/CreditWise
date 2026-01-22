
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectBarnes() {
    console.log("Searching for 'Barnes'...");

    // 1. Find Profile
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%Barnes%');

    if (profileError) {
        console.error("Profile Search Error:", profileError);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log("No profile found with name like 'Barnes'");
        return;
    }

    console.log(`Found ${profiles.length} profile(s):`);

    for (const profile of profiles) {
        console.log(`- User: ${profile.full_name} (${profile.id})`);

        // 2. Find Loans for this User
        const { data: loans, error: loanError } = await supabase
            .from('loans')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false });

        if (loanError) {
            console.error("  Loan Search Error:", loanError);
            continue;
        }

        console.log(`  Loans (${loans.length}):`);
        loans.forEach(l => {
            console.log(`    - [${l.status.toUpperCase()}] ID: ${l.id} | Amount: ${l.amount} | Created: ${l.created_at}`);
            console.log(`      App Data:`, JSON.stringify(l.application_data || {}).substring(0, 100) + "...");
        });

        // 3. Check Verification Status
        const { data: verification, error: verifError } = await supabase
            .from('verifications')
            .select('*')
            .eq('user_id', profile.id)
            .single();

        if (verifError && verifError.code !== 'PGRST116') {
            console.log("  Verification Error:", verifError.message);
        } else {
            console.log(`  Verification Status:`, verification ? "FOUND" : "NOT FOUND");
            if (verification) {
                console.log(`    - Is Employed: ${verification.is_employed}`);
                console.log(`    - Employment Status: ${verification.employment_status}`);
            }
        }
    }
}

inspectBarnes();
