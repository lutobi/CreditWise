import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendHRVerificationEmail } from '@/app/actions/hr-verification'

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { loanId } = await req.json()

        if (!loanId) {
            return NextResponse.json({ success: false, error: 'Loan ID required' }, { status: 400 })
        }

        // 1. Get Loan Data
        const { data: loan, error: fetchError } = await supabase
            .from('loans')
            .select(`*`)
            .eq('id', loanId)
            .single()

        if (fetchError) {
            console.error('[HR Verify] Fetch Error:', fetchError)
        }

        if (fetchError || !loan) {
            return NextResponse.json({ success: false, error: `Loan not found (ID: ${loanId})` }, { status: 404 })
        }

        const appData = loan.application_data || {}

        // 2. Get HR Contact and Applicant Info
        const hrEmail = appData.hrEmail
        const hrName = appData.hrName || 'HR Department'
        const employerName = appData.employerName || 'Your Organization'

        if (!hrEmail) {
            return NextResponse.json({ success: false, error: 'HR email not provided in application' }, { status: 400 })
        }

        // 3. Fetch User Email from Auth Admin API
        const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(loan.user_id)

        if (authError || !user || !user.email) {
            return NextResponse.json({ success: false, error: 'User email not found' }, { status: 404 })
        }

        const applicantEmail = user.email
        const applicantName = user.user_metadata?.full_name || appData.firstName + ' ' + appData.lastName || 'Applicant'

        // 4. Send Email
        const result = await sendHRVerificationEmail(hrEmail, applicantEmail, applicantName, employerName)

        if (!result.success) {
            return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 })
        }

        // 5. Log the action
        const { logAudit } = await import('@/lib/audit')
        await logAudit(loanId, 'HR_VERIFICATION_EMAIL_SENT', { hrEmail, applicantEmail }, 'system')

        // 6. Update application data to track that HR verification was requested
        await supabase
            .from('loans')
            .update({
                application_data: {
                    ...appData,
                    hr_verification_requested: true,
                    hr_verification_requested_at: new Date().toISOString()
                }
            })
            .eq('id', loanId)

        return NextResponse.json({ success: true, message: `Verification email sent to ${hrEmail}` })

    } catch (error: any) {
        console.error('HR Verification API Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
