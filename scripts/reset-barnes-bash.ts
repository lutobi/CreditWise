
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TARGET_USER_ID = '8824ca78-3875-4792-943d-a234e6808fa2'; // Barnes Bash

async function resetUser() {
    console.log(`--- Resetting Data for User: ${TARGET_USER_ID} ---`);

    // 1. Delete Loans
    const { error: loanError, count: loanCount } = await supabase
        .from('loans')
        .delete({ count: 'exact' })
        .eq('user_id', TARGET_USER_ID);

    if (loanError) console.error("Error deleting loans:", loanError);
    else console.log(`✅ Deleted ${loanCount} loans.`);

    // 2. Delete Verifications
    const { error: verifError, count: verifCount } = await supabase
        .from('verifications')
        .delete({ count: 'exact' })
        .eq('user_id', TARGET_USER_ID);

    if (verifError) console.error("Error deleting verifications:", verifError);
    else console.log(`✅ Deleted ${verifCount} verification records.`);

    // 3. Reset Audit Logs (Optional but good for clean slate)
    // Audit logs usually link to loan_id, so cascading delete might have handled it, 
    // but we can check if there are any orphaned ones or if we want to clear generally for this user?
    // The schema might not have user_id on audit_logs directly if it relies on loan_id.
    // Let's assume cascading/loan deletion handled most.

    console.log("--- Reset Complete. User can now apply afresh. ---");
}

resetUser();
