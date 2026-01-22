import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateLoanAgreement } from '@/lib/pdf-generator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { loanId } = await req.json();

        if (!loanId) {
            return NextResponse.json({ error: 'Loan ID required' }, { status: 400 });
        }

        // 1. AUTH CHECK (Admin Only)
        const cookieStore = await cookies();
        const authClient = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll() }
                }
            }
        );

        const { data: { session: cookieSession } } = await authClient.auth.getSession();
        let session = cookieSession;

        // FAILOVER: Check Authorization Header if cookie session failed
        if (!session && req.headers.get('Authorization')) {
            const authHeader = req.headers.get('Authorization');
            const token = authHeader?.split(' ')[1];
            if (token) {
                const { data: { user }, error } = await authClient.auth.getUser(token);
                if (user && !error) {
                    // @ts-ignore - Construct a minimal session object
                    session = { user, access_token: token };
                }
            }
        }

        const appRole = session?.user?.app_metadata?.role;
        const userRole = session?.user?.user_metadata?.role;
        const role = appRole || userRole;
        const isAdmin = role === 'admin' || role === 'admin_approver' || role === 'super_admin';

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. FETCH DATA (Service Role)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Use wildcard selection to avoid errors with missing columns
        const { data: loans, error: loanError } = await supabase
            .from('loans')
            .select('*, profiles:user_id (*)')
            .eq('id', loanId)
            .limit(1);

        const loan = loans?.[0];

        if (loanError) {
            console.error("Contract Fetch Error:", loanError);
            return NextResponse.json({ error: `DB Error: ${loanError.message}` }, { status: 500 });
        }

        if (!loan) {
            return NextResponse.json({ error: 'Loan not found (ID invalid)' }, { status: 404 });
        }

        // AUTHORIZATION: Allow admin OR the loan owner
        const isOwner = loan.user_id === session.user?.id;
        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'Unauthorized - not your loan' }, { status: 401 });
        }

        const profile = loan.profiles as any;

        // 3. GENERATE PDF
        try {
            const pdfBuffer = await generateLoanAgreement(loan, profile || {});

            return new NextResponse(pdfBuffer as any, {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="loan_agreement_${loanId.slice(0, 8)}.pdf"`
                }
            });
        } catch (genError: any) {
            console.error("PDF Generation Error Details:", genError);
            return NextResponse.json({ error: `Failed to generate PDF: ${genError.message}` }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Contract Route Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
