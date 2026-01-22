import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // 1. AUTH CHECK
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

        let { data: { session } } = await authClient.auth.getSession();

        // FAILOVER: Check Authorization Header if cookie session failed
        if (!session && req.headers.get('Authorization')) {
            const authHeader = req.headers.get('Authorization');
            const token = authHeader?.split(' ')[1];
            if (token) {
                const { data: { user }, error } = await authClient.auth.getUser(token);
                if (user && !error) {
                    // @ts-ignore
                    session = { user, access_token: token };
                }
            }
        }

        const appRole = session?.user?.app_metadata?.role;
        const userRole = session?.user?.user_metadata?.role;
        const role = appRole || userRole;

        if (!session || (role !== 'admin' && role !== 'admin_approver' && role !== 'super_admin')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // 2. FETCH ACTIVE LOANS (Service Role)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: loans, error: loansError } = await supabase
            .from('loans')
            .select('*, profiles:user_id (*)')
            .in('status', ['approved', 'disbursed'])
            .order('created_at', { ascending: false });

        if (loansError) {
            console.error('Active Loans Fetch Error:', loansError);
            return NextResponse.json({ success: false, error: loansError.message }, { status: 500 });
        }

        // Calculate payment details for each loan
        const INTEREST_RATE = 0.25;
        const loansWithPaymentDetails = (loans || []).map(loan => {
            const totalRepayment = loan.amount * (1 + INTEREST_RATE * loan.duration_months);
            const monthlyPayment = totalRepayment / loan.duration_months;
            const amountPaid = loan.amount_paid || 0;
            const outstanding = totalRepayment - amountPaid;

            let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
            if (amountPaid >= totalRepayment) {
                paymentStatus = 'paid';
            } else if (amountPaid > 0) {
                paymentStatus = 'partial';
            }

            // @ts-ignore
            const profile = loan.profiles || {};

            return {
                id: loan.id,
                user_id: loan.user_id,
                customer_name: profile.full_name || 'Unknown',
                national_id: profile.national_id || 'N/A',
                phone: profile.phone || 'N/A',
                loan_amount: loan.amount,
                duration_months: loan.duration_months,
                total_repayment: Math.round(totalRepayment * 100) / 100,
                monthly_payment: Math.round(monthlyPayment * 100) / 100,
                amount_paid: amountPaid,
                outstanding: Math.round(outstanding * 100) / 100,
                payment_status: paymentStatus,
                created_at: loan.created_at,
                completed_at: loan.completed_at
            };
        });

        // Summary stats
        const summary = {
            total_active: loansWithPaymentDetails.filter(l => l.payment_status !== 'paid').length,
            total_outstanding: loansWithPaymentDetails.reduce((sum, l) => sum + l.outstanding, 0),
            total_collected: loansWithPaymentDetails.reduce((sum, l) => sum + l.amount_paid, 0),
            fully_paid: loansWithPaymentDetails.filter(l => l.payment_status === 'paid').length
        };

        return NextResponse.json({
            success: true,
            data: loansWithPaymentDetails,
            summary
        });

    } catch (error: any) {
        console.error('Active Loans API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
