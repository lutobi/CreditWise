import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Fetch profiles
        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('*')
            .order('updated_at', { ascending: false });

        if (pError) throw pError;

        // 2. Fetch auth users (to get emails)
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        const authMap = new Map();
        authData.users.forEach(u => authMap.set(u.id, u.email));

        // 3. Fetch loans (to determine drop-offs vs applicants)
        const { data: loans, error: lError } = await supabase
            .from('loans')
            .select('user_id, status, created_at');

        if (lError) throw lError;

        const loanMap = new Map();
        loans.forEach(l => {
            // Keep the most relevant status
            if (!loanMap.has(l.user_id) || l.status === 'pending' || l.status === 'active') {
                loanMap.set(l.user_id, l.status);
            }
        });

        // 4. Combine data
        const enrichedProfiles = profiles?.map(p => {
            const email = authMap.get(p.id) || null;
            const loanStatus = loanMap.get(p.id);
            let userStatus = 'Registered';
            let statusColor = 'yellow';

            if (loanStatus === 'pending') {
                userStatus = 'In Review';
                statusColor = 'blue';
            } else if (loanStatus === 'active') {
                userStatus = 'Active Loan';
                statusColor = 'green';
            } else if (loanStatus === 'approved') {
                userStatus = 'Approved';
                statusColor = 'green';
            } else if (loanStatus === 'rejected') {
                userStatus = 'Declined';
                statusColor = 'red';
            } else if (p.address || p.phone_number) {
                userStatus = 'Profile Completed (No Loan)'; // Drop-off stage 2
                statusColor = 'amber';
            } else {
                userStatus = 'Sign-Up Drop-Off'; // Drop-off stage 1
                statusColor = 'slate';
            }

            return {
                ...p,
                email,
                userStatus,
                statusColor
            };
        });

        return NextResponse.json({ success: true, data: enrichedProfiles });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
