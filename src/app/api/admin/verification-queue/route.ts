import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // 1. Service Role Client (Bypasses ALL RLS)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 2. Fetch Pending Loans
        const { data: loans, error: loanError } = await supabase
            .from('loans')
            .select('*, profiles!inner(full_name, national_id)')
            .eq('status', 'pending');

        if (loanError) throw loanError;

        if (!loans || loans.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        // 3. Fetch Verifications
        const userIds = loans.map(l => l.user_id);
        const { data: verifs } = await supabase
            .from('verifications')
            .select('*')
            .in('user_id', userIds);

        // 4. Map & Sign URLs
        const itemsPromise = loans.map(async (l) => {
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

            const [idSigned, payslipSigned, selfieSigned, prevSelfieSigned] = await Promise.all([
                sign(rawId),
                sign(rawPayslip),
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
                monthly_income: monthlyIncome,
                employer_name: employerName,
                employment_type: employmentType,
                is_employed: !!v?.is_employed,
                confidence: v?.confidence || 0,
                // New fields for persistence
                face_verified: v?.face_verified,
                verified_at: v?.updated_at || v?.created_at,
                reference_id: l.application_data?.refId || 'N/A',
                status_detail: l.application_data?.status_detail,
                retake_reason: l.application_data?.retakeReason,
                retake_type: l.application_data?.retakeType,
                requests: l.application_data?.requests,
                documents: {
                    id_url: idSigned || '',
                    payslip_url: payslipSigned || '',
                    selfie_url: selfieSigned || '',
                    previous_selfie_url: prevSelfieSigned || ''
                }
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
