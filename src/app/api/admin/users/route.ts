import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

const STEP_NAMES: Record<number, string> = {
    1: 'Personal Details',
    2: 'Employment & Income',
    3: 'Banking Details',
    4: 'Loan Details',
    5: 'References',
    6: 'Documents',
    7: 'Declaration',
};

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

        // 2. Fetch auth users (to get emails + user_metadata for step tracking)
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw authError;

        const authMap = new Map<string, { email: string; step: number; stepDate: string | null }>();
        authData.users.forEach(u => authMap.set(u.id, {
            email: u.email || '',
            step: u.user_metadata?.application_step || 0,
            stepDate: u.user_metadata?.application_step_updated_at || null
        }));

        // 3. Fetch loans (to determine drop-offs vs applicants)
        const { data: loans, error: lError } = await supabase
            .from('loans')
            .select('user_id, status, created_at');

        if (lError) throw lError;

        const loanMap = new Map();
        loans.forEach(l => {
            if (!loanMap.has(l.user_id) || l.status === 'pending' || l.status === 'active') {
                loanMap.set(l.user_id, l.status);
            }
        });

        // 4. Combine data with step-level drop-off info
        const enrichedProfiles = profiles?.map(p => {
            const authInfo = authMap.get(p.id);
            const email = authInfo?.email || null;
            const appStep = authInfo?.step || 0;
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
            } else if (appStep > 0) {
                // User started the wizard but never submitted
                const stepName = STEP_NAMES[appStep] || `Step ${appStep}`;
                userStatus = `Drop-Off at Step ${appStep} (${stepName})`;
                statusColor = 'amber';
            } else if (p.address || p.phone_number) {
                userStatus = 'Profile Only (Never Started Application)';
                statusColor = 'slate';
            } else {
                userStatus = 'Sign-Up Only';
                statusColor = 'slate';
            }

            return {
                ...p,
                email,
                userStatus,
                statusColor,
                applicationStep: appStep
            };
        });

        return NextResponse.json({ success: true, data: enrichedProfiles });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
