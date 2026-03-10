import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/safe-logger'
import { validateCSRF } from '@/lib/csrf'
import {
    personalDetailsSchema,
    employmentDetailsSchema,
    bankingDetailsSchema,
    loanDetailsSchema,
    referencesSchema,
    declarationSchema
} from '@/lib/validation'

export async function POST(req: NextRequest) {
    try {
        // 0. CSRF Protection
        const csrf = await validateCSRF(req);
        if (!csrf.valid) {
            return NextResponse.json({ success: false, error: csrf.error }, { status: 403 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Auth Check
        const authHeader = req.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized: Invalid Token' }, { status: 401 })
        }

        // 1.5 Rate Limiting (per user, 5 submissions per day)
        const rateLimitKey = `loan-submit:${user.id}`;
        const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.LOAN_SUBMIT);
        if (!rateLimit.success) {
            return NextResponse.json(
                { success: false, error: 'You have submitted too many applications today. Please try again tomorrow.' },
                { status: 429 }
            );
        }

        const formData = await req.json()

        // 1.7 Zod Validation
        try {
            if (!formData.isFastTrack) {
                personalDetailsSchema.parse(formData);
                employmentDetailsSchema.parse(formData);
                bankingDetailsSchema.parse(formData);
                loanDetailsSchema.parse(formData);
                referencesSchema.parse(formData);
                // declarationSchema uses declarationDate and signatureName fields
                declarationSchema.parse({
                    termsAccepted: formData.termsAccepted,
                    signatureName: formData.signatureName,
                    declarationDate: formData.declarationDate || new Date().toISOString()
                });
            } else {
                if (!formData.loanAmount || !formData.recentPayslip || !formData.termsAccepted) {
                    throw new Error("Missing required fast-track fields: loanAmount, recentPayslip, termsAccepted");
                }
            }
        } catch (validationError: any) {
            logger.warn('Loan submission validation failed', { error: validationError.errors });
            return NextResponse.json({
                success: false,
                error: 'Invalid application data',
                details: validationError.errors
            }, { status: 400 });
        }

        // 2. Capture Metadata (IP & User Agent)
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('remote-addr') || 'unknown;';
        const userAgent = req.headers.get('user-agent') || 'unknown';
        const clientUserAgent = formData.clientUserAgent || 'unknown'; // Optional backup from client

        const submissionMetadata = {
            ip_address: ip.split(',')[0].trim(), // Get first IP if multiple
            user_agent: userAgent,
            client_user_agent: clientUserAgent,
            signed_at: new Date().toISOString(),
            signature_name: formData.signatureName || 'Electronic Signature',
            consent_granted: true
        };
        // 2.5 Risk Assessment (Identity Consistency)
        const { data: history } = await supabase
            .from('loans')
            .select('application_data')
            .eq('user_id', user.id)
            .in('status', ['completed', 'approved'])
            .order('created_at', { ascending: false })
            .limit(1);

        const riskFlags: string[] = [];
        let initialStatus = 'pending';
        let statusVal = 'In Queue';

        if (history && history.length > 0) {
            const prev = typeof history[0].application_data === 'string'
                ? JSON.parse(history[0].application_data)
                : history[0].application_data;

            if (prev) {
                if (prev.nationalId && formData.nationalId && prev.nationalId.trim() !== formData.nationalId.trim()) {
                    riskFlags.push(`National ID Changed (Was: ${prev.nationalId})`);
                }
                if (prev.dob && formData.dob && prev.dob !== formData.dob) {
                    riskFlags.push(`DOB Changed (Was: ${prev.dob})`);
                }
            }
        }

        if (formData.isFastTrack) {
            // 2.6 Credit Bureau Desperation Check & Whitelist
            const { creditBureau } = await import('@/lib/credit-bureau');
            const bureauCheck = await creditBureau.checkRecentInquiries(formData.nationalId || 'UNKNOWN');

            // Check whitelist/blacklist manually injected into profile
            const { data: profileCheck } = await supabase.from('profiles').select('employment_status').eq('id', user.id).single();

            if (profileCheck?.employment_status === 'Terminated') {
                riskFlags.push('[Admin] User marked as Terminated. Fast-Track BLOCKED.');
                initialStatus = 'rejected';
                statusVal = 'Policy Block';
            } else if (bureauCheck.spikeDetected) {
                riskFlags.push(`[Compuscan] Desperation Spike Detected: ${bureauCheck.inquiriesLast7Days} recent inquiries`);
                initialStatus = 'pending'; // Requires manual intervention
                statusVal = 'Requires Manual Verification (Spike)';
            } else {
                riskFlags.push('[Fast-Track] Priority Express application.');
                initialStatus = 'pending'; // Requires HR Verification, but goes to the top of the queue
                statusVal = 'Express Verification (Priority)';
            }
        }

        // 2.7 AI Income Discrepancy Check
        if (formData.verificationData && formData.monthlyIncome) {
            const statedIncome = parseFloat(String(formData.monthlyIncome));
            const auditedIncome = parseFloat(String(formData.verificationData.estimatedIncome));

            if (auditedIncome > 0) {
                const diff = Math.abs(statedIncome - auditedIncome) / auditedIncome;
                if (diff > 0.15) { // 15% discrepancy threshold
                    riskFlags.push(`[Audit] Income Discrepancy: Stated N$${statedIncome} vs Audited N$${auditedIncome} (${(diff * 100).toFixed(1)}% diff)`);
                }
            } else if (statedIncome > 0 && formData.verificationData.incomeConfidence === 0) {
                // If user claims income but AI found zero with high confidence of zero
                riskFlags.push(`[Audit] No salary detected on statement (Stated N$${statedIncome})`);
            }
        }

        // 3. Upsert Profile
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: user.id,
            full_name: `${formData.firstName} ${formData.lastName}`.trim(),
            national_id: formData.nationalId,
            phone_number: formData.phone,
            updated_at: new Date().toISOString()
        })
        if (profileError) throw profileError;

        // 4. Upsert Verification
        const { error: verifError } = await supabase.from('verifications').upsert({
            user_id: user.id,
            employment_status: formData.employmentType,
            monthly_income: parseFloat(formData.monthlyIncome),
            employer_name: formData.employerName,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

        if (verifError) console.error('Verification Upsert Error (Non-blocking):', verifError);

        // 5. Create Loan
        // Ensure loanAmount is a number
        const amount = typeof formData.loanAmount === 'string' ? parseFloat(formData.loanAmount) : formData.loanAmount;

        // Generate Reference ID
        const refId = `OMR-${Math.floor(100000 + Math.random() * 900000)}`;

        // Combine form data with new metadata
        const applicationData = {
            ...formData,
            refId,
            risk_flags: riskFlags,
            submission_metadata: submissionMetadata
        };

        const { data: loan, error: loanError } = await supabase.from('loans').insert({
            user_id: user.id,
            amount: amount,
            duration_months: formData.repaymentPeriod,
            monthly_payment: amount / formData.repaymentPeriod,
            interest_rate: 5,
            purpose: formData.loanPurpose,
            status: initialStatus,
            application_data: {
                ...applicationData,
                status_val: statusVal
            }
        }).select().single()

        if (loanError) throw loanError;

        // 6. Notify Admin (Internal call to existing endpoint logic, or direct call)
        // We can just call the notify endpoint logic here or fire-and-forget fetch to it.
        // For simplicity and decoupling, we'll let the client or a separate process handle notification, 
        // BUT since we are server-side, we should ensure notification happens.
        // Let's do a fetch to our own notify endpoint to keep logic centralized.

        try {
            // Self-call to notify endpoint. Ideally this should be a direct function call if possible, 
            // but the notify route might be complex. Let's just replicate the notification logic or use the URL.
            // Using absolute URL requires knowing the host. 
            // Better to just inline the notification logic or import it?
            // "src/app/actions/email.ts" has sendAdminLoanAlert. Let's use that.

            const { sendAdminLoanAlert } = await import('@/app/actions/email');
            const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single();

            await sendAdminLoanAlert({
                amount: amount,
                duration: formData.repaymentPeriod,
                applicantName: profile?.full_name || 'Applicant',
                applicantEmail: user.email || 'no-email'
            });

        } catch (notifyError: any) {
            logger.warn('Notification failed', { error: notifyError?.message });
            // Don't fail the request, just log
        }

        // 7. Audit Log
        try {
            const { logAudit } = await import('@/lib/audit');
            await logAudit(loan.id, 'LOAN_SUBMITTED', { amount, refId }, user.id);
        } catch (e: any) {
            logger.warn('Audit log failed', { error: e?.message });
        }

        return NextResponse.json({ success: true, loanId: loan.id, refId });

    } catch (error: any) {
        logger.error('Loan submit failed', { error: error?.message });
        return NextResponse.json({ success: false, error: 'Submission failed. Please try again.' }, { status: 500 })
    }
}
