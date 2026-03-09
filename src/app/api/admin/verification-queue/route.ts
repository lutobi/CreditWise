import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // AUTH CHECK
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    try {
        // 1. Service Role Client (Bypasses ALL RLS)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 2. Fetch Pending Loans
        const { data: loans, error: loanError } = await supabase
            .from('loans')
            .select('*, profiles!inner(full_name, national_id, phone_number)')
            .eq('status', 'pending');
        // .neq('application_data->>status_detail', 'video_verified'); // REMOVED: potentially incorrect with NULLs

        if (loanError) throw loanError;

        if (!loans || loans.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        // Filter in memory to safely handle missing/null keys
        // We want to SHOW loans that are NOT 'video_verified'
        const filteredLoans = loans.filter(l => l.application_data?.status_detail !== 'video_verified');

        if (filteredLoans.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        // 3. Fetch Verifications
        const userIds = filteredLoans.map(l => l.user_id);
        const { data: verifs } = await supabase
            .from('verifications')
            .select('*')
            .in('user_id', userIds);

        // 4. Map & Sign URLs
        const itemsPromise = filteredLoans.map(async (l) => {
            const v = verifs?.find(ver => ver.user_id === l.user_id);
            const appData = l.application_data || {};

            // Data Fallbacks
            const monthlyIncome = v?.monthly_income || appData.monthlyIncome || 0;
            const employerName = v?.employer_name || appData.employerName || 'Unknown';
            const employmentType = v?.employment_status || appData.employmentType || 'Unknown';

            // Document Paths
            const existingDocs = l.documents || {};
            const rawId = existingDocs.id_url || appData.idDocument || appData.id_url;
            const rawPayslip = existingDocs.payslip_url || appData.payslip || appData.payslip_url;
            const rawRecentPayslip = existingDocs.recentPayslip_url || appData.recentPayslip || null;
            const rawSelfie = existingDocs.selfie_url || appData.selfie || appData.selfie_url || appData.selfieUrl;
            const rawPreviousSelfie = appData.previous_selfie_url;

            // Helper to get path
            const getPath = (url?: string) => {
                if (!url) return null;
                try {
                    // If it's already just a path (no http), return it
                    if (!url.startsWith('http')) return url;
                    // If it's a supabase URL, extract path after /documents/
                    if (url.includes('/documents/')) {
                        const parts = url.split('/documents/');
                        return decodeURIComponent(parts[1]);
                    }
                    return null;
                } catch (e) { return null; }
            }

            // Sign URL using Service Role (Bypasses 'Private' bucket restriction)
            const sign = async (url?: string) => {
                const path = getPath(url);
                if (!path) return url;

                const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600);
                return data?.signedUrl || url;
            }

            const [idSigned, payslipSigned, recentPayslipSigned, selfieSigned, prevSelfieSigned] = await Promise.all([
                sign(rawId),
                sign(rawPayslip),
                sign(rawRecentPayslip),
                sign(rawSelfie),
                sign(rawPreviousSelfie)
            ]);

            return {
                loan_id: l.id,
                user_id: l.user_id,
                amount: l.amount,
                duration_months: l.duration_months,
                status: l.status,
                created_at: l.created_at,
                full_name: l.profiles?.full_name || appData.firstName + ' ' + appData.lastName || 'Unknown',
                national_id: l.profiles?.national_id || appData.nationalId || 'Unknown',
                phone: l.profiles?.phone_number || appData.phone || 'Unknown',
                monthly_income: monthlyIncome,
                employer_name: employerName,
                employment_type: employmentType,
                // Freshness Check: Only show verification if it happened AFTER the loan application
                is_employed: !!v?.is_employed, // Employment status is generally sticky, so we keep it
                confidence: (v?.updated_at && new Date(v.updated_at) > new Date(l.created_at)) ? (v.confidence || 0) : 0,
                face_verified: (v?.updated_at && new Date(v.updated_at) > new Date(l.created_at)) ? v.face_verified : undefined,
                verified_at: (v?.updated_at && new Date(v.updated_at) > new Date(l.created_at)) ? v.updated_at : undefined,
                reference_id: l.application_data?.refId || 'N/A',
                status_detail: l.application_data?.status_detail,
                retake_reason: l.application_data?.retakeReason,
                retake_type: l.application_data?.retakeType,
                requests: l.application_data?.requests,
                documents: {
                    id_url: idSigned || '',
                    payslip_url: payslipSigned || '',
                    recent_payslip_url: recentPayslipSigned || '',
                    selfie_url: selfieSigned || '',
                    previous_selfie_url: prevSelfieSigned || ''
                },
                // HR & Kin Details
                hr_name: appData.hrName || 'N/A',
                hr_email: appData.hrEmail || 'N/A',
                hr_phone: appData.hrPhone || 'N/A',
                hr_verification_requested: appData.hr_verification_requested || false,
                hr_verification_requested_at: appData.hr_verification_requested_at || null,
                kin_name: appData.nextOfKinName || 'N/A',
                kin_relationship: appData.nextOfKinRelationship || 'N/A',
                kin_contact: appData.nextOfKinContact || 'N/A',
                kin_address: appData.nextOfKinAddress || 'N/A',
                // AI Audit Data
                ai_analysis: appData.verificationData || null,
                risk_flags: appData.riskFlags || []
            };
        });

        const items = await Promise.all(itemsPromise);

        // Return ALL pending items, even if they were verified before.
        // The policy is now "Verify Every Loan".
        const pendingItems = items;

        return NextResponse.json({ success: true, data: pendingItems });

    } catch (error: any) {
        console.error("Queue API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
