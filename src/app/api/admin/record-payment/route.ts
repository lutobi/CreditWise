import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { loanId, amount, paymentMethod, referenceNumber, receivedAt, notes } = await req.json();

        if (!loanId || !amount) {
            return NextResponse.json({ success: false, error: 'Loan ID and amount are required' }, { status: 400 });
        }

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

        // FAILOVER: Check Authorization Header
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

        // 2. RECORD PAYMENT (Service Role)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get current loan data
        const { data: loan, error: loanError } = await supabase
            .from('loans')
            .select('amount, duration_months, amount_paid')
            .eq('id', loanId)
            .single();

        if (loanError || !loan) {
            return NextResponse.json({ success: false, error: 'Loan not found' }, { status: 404 });
        }

        // Calculate totals
        const INTEREST_RATE = 0.25;
        const totalRepayment = loan.amount * (1 + INTEREST_RATE * loan.duration_months);
        const currentPaid = loan.amount_paid || 0;
        const newTotalPaid = currentPaid + parseFloat(amount);

        // Insert payment record
        const { error: paymentError } = await supabase
            .from('loan_payments')
            .insert({
                loan_id: loanId,
                amount: parseFloat(amount),
                payment_method: paymentMethod || 'eft',
                reference_number: referenceNumber || null,
                received_at: receivedAt || new Date().toISOString(),
                recorded_by: session.user?.id,
                notes: notes || null
            });

        if (paymentError) {
            console.error('Payment Insert Error:', paymentError);
            return NextResponse.json({ success: false, error: paymentError.message }, { status: 500 });
        }

        // Update loan's amount_paid
        const updateData: any = { amount_paid: newTotalPaid };

        // Check if fully paid - just set completed_at, don't change status
        // (The database has a check constraint that doesn't include 'completed')
        if (newTotalPaid >= totalRepayment) {
            updateData.completed_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase
            .from('loans')
            .update(updateData)
            .eq('id', loanId);

        if (updateError) {
            console.error('Loan Update Error:', updateError);
            return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Payment recorded successfully',
            data: {
                amount_paid: newTotalPaid,
                outstanding: Math.max(0, totalRepayment - newTotalPaid),
                is_fully_paid: newTotalPaid >= totalRepayment
            }
        });

    } catch (error: any) {
        console.error('Record Payment API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
