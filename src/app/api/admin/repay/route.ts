
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { logAudit } from '@/lib/audit'

export async function POST(request: Request) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
            },
        }
    )

    // 1. Check Auth (Admin Only)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const appRole = session.user.app_metadata?.role
    const userRole = session.user.user_metadata?.role
    const role = appRole || userRole

    // Only approvers or super admins should handle money ideally, but let's allow verifiers too for flexibility
    if (role !== 'admin' && role !== 'admin_verifier' && role !== 'admin_approver') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Service Role Client (For DB Ops)
    const adminDb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const body = await request.json()
        const { loanId, amount, method, reference, date } = body

        if (!loanId || !amount || !method) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // 3. Fetch Loan Details (Total Due) - Using Admin DB
        const { data: loan, error: loanError } = await adminDb
            .from('loans')
            .select('amount, interest_rate, status')
            .eq('id', loanId)
            .single()

        if (loanError || !loan) throw new Error("Loan not found")

        // 4. Insert Repayment - Using Admin DB
        const { error: insertError } = await adminDb.from('repayments').insert({
            loan_id: loanId,
            amount: parseFloat(amount),
            method,
            reference,
            payment_date: date || new Date().toISOString(),
            created_by: session.user.id
        })

        if (insertError) throw insertError

        // 5. Check Audit & Update Balance
        // Calculate Total Paid so far
        const { data: repayments } = await adminDb
            .from('repayments')
            .select('amount')
            .eq('loan_id', loanId)

        const totalPaid = repayments?.reduce((sum, r) => sum + r.amount, 0) || 0
        const totalDue = loan.amount + (loan.amount * (loan.interest_rate || 25) / 100) // Simple interest

        let newStatus = loan.status
        if (totalPaid >= totalDue && loan.status !== 'paid') {
            newStatus = 'paid'
            // Update Loan Status
            await adminDb.from('loans').update({ status: 'paid' }).eq('id', loanId)

            // Log Loan Paid Audit
            await logAudit(loanId, 'LOAN_PAID', {
                totalPaid,
                message: "Loan fully settled"
            }, session.user.id)
        }

        // Log Payment Audit
        await logAudit(loanId, 'PAYMENT_RECEIVED', {
            amount,
            method,
            newBalance: totalDue - totalPaid
        }, session.user.id)

        return NextResponse.json({ success: true, newStatus, totalPaid })

    } catch (e: any) {
        console.error("Repayment Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
