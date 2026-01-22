
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugQueue() {
    console.log("--- Debugging Approval Queue Logic ---");

    // 1. Fetch Loans (Pending)
    console.log("1. Fetching Pending Loans...");
    const { data: loans, error: loansError } = await supabase
        .from('loans')
        .select('*, profiles:user_id (full_name, national_id)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (loansError) {
        console.error("Error fetching loans:", loansError);
        return;
    }
    console.log(`   Found ${loans?.length || 0} loans.`);

    if (!loans || loans.length === 0) return;

    // Filter to Barnes only for clarity
    const barnesLoans = loans.filter(l => {
        const name = Array.isArray(l.profiles) ? l.profiles[0]?.full_name : l.profiles?.full_name;
        return name?.toLowerCase().includes('barnes');
    });

    console.log(`   Found ${barnesLoans.length} loans for 'Barnes':`);
    barnesLoans.forEach(l => console.log(`     - Loan ${l.id} (User: ${l.user_id})`));

    // 2. Verified Filter
    console.log("\n2. Fetching Verifications (is_employed=true)...");
    const userIds = loans.map(l => l.user_id);
    const { data: verifs, error: verifError } = await supabase
        .from('verifications')
        .select('*')
        .in('user_id', userIds)
        .eq('is_employed', true);

    if (verifError) {
        console.error("Error fetching verifications:", verifError);
        return;
    }
    console.log(`   Found ${verifs?.length || 0} verified users.`);

    // 3. Match Logic
    const validVerifs = verifs || [];
    const verifiedLoans = loans.filter(l => validVerifs.some(v => v.user_id === l.user_id));

    console.log(`\n3. Final Approval Queue Items: ${verifiedLoans.length}`);

    // Check if Barnes is in the final list
    const barnesInFinal = verifiedLoans.filter(l => {
        const name = Array.isArray(l.profiles) ? l.profiles[0]?.full_name : l.profiles?.full_name;
        return name?.toLowerCase().includes('barnes');
    });

    if (barnesInFinal.length > 0) {
        console.log("✅ SUCCESS: Barnes Bash IS in the queue logic.");
        barnesInFinal.forEach(l => console.log(`     - Loan ${l.id} | Amount: ${l.amount}`));
    } else {
        console.log("❌ FAILURE: Barnes Bash is NOT in the queue logic.");
        console.log("   Reason analysis:");
        if (barnesLoans.length === 0) console.log("   - Loan not found in 'pending' list (Step 1).");
        else {
            const userId = barnesLoans[0].user_id;
            const isVerified = verifs?.find(v => v.user_id === userId);
            console.log(`   - User ${userId} verification found? ${!!isVerified}`);
            if (!isVerified) console.log("     (Maybe is_employed is FALSE or user_id mismatch?)");
        }
    }
}

debugQueue();
