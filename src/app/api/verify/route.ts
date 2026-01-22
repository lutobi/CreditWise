import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client for Server-Side Use
// Note: In a production app with 'cookie' auth, use @supabase/ssr
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
    // 1. Security: Extract Auth Token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return NextResponse.json({ success: false, error: 'Missing Authorization Header' }, { status: 401 });
    }

    // 2. Security: Validate User Session
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Invalid Session' }, { status: 401 });
    }

    const body = await request.json();
    const { income, employmentType, loanId } = body; // Expect loanId

    // Deterministic Scoring Formula
    let score = 300; // Base Score

    // 1. Income Factors
    const monthlyIncome = parseFloat(income || '0');
    if (monthlyIncome > 15000) {
        score += 200;
    } else if (monthlyIncome > 5000) {
        score += 100;
    }

    // 2. Employment Type Factors
    const type = employmentType || '';
    if (type.toLowerCase().includes('government')) {
        score += 200;
    } else if (type.toLowerCase().includes('permanent')) {
        score += 150;
    } else if (type.toLowerCase().includes('contract')) {
        score += 50;
    }

    // Cap at 1000
    if (score > 1000) score = 1000;

    const isQualified = score >= 600;

    // 3. FETCH LOAN to get correct User ID (Fixes Admin ID bug)
    const { data: loan, error: loanError } = await supabase
        .from('loans')
        .select('user_id, application_data')
        .eq('id', loanId)
        .single();

    if (loanError || !loan) {
        return NextResponse.json({ success: false, error: 'Loan not found' }, { status: 404 });
    }

    // 4. PERSISTENCE
    // Use Service Role to write to verification table
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { error: updateError } = await supabaseAdmin
        .from('verifications')
        .update({
            is_employed: true, // Mark as Verified (Moves to Approval Queue)
            credit_score: score,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', loan.user_id);

    // 4.1 Update Loan Status to Clear Retake & Move to "Under Review" visually
    if (loanId) {
        const { error: loanUpdateErr } = await supabaseAdmin
            .from('loans')
            .update({
                status: 'pending', // Ensure it's pending (or could be 'under_review' if supported)
                application_data: {
                    ...loan.application_data,
                    status_detail: 'video_verified', // Clear 'retake_requested'
                    requests: {} // Clear any pending requests
                }
            })
            .eq('id', loanId);

        if (loanUpdateErr) console.error("Failed to clear loan retake flags:", loanUpdateErr);
    }

    if (updateError) {
        console.error("Verification Update Failed:", updateError);
        return NextResponse.json({ success: false, error: "Failed to update database" }, { status: 500 });
    }

    // 4. AUDIT LOG
    if (loanId) {
        // Dynamic import to avoid circular dep issues if any? No.
        const { logAudit } = await import('@/lib/audit');
        await logAudit(loanId, 'VERIFICATION_PASSED', { score, isQualified, income, type }, user.id);
    }

    return NextResponse.json({
        success: true,
        data: {
            verified: true,
            score: score,
            isQualified: isQualified,
            breakdown: {
                base: 300,
                incomeFactor: monthlyIncome > 15000 ? 200 : (monthlyIncome > 5000 ? 100 : 0),
                employmentFactor: score - 300 - (monthlyIncome > 15000 ? 200 : (monthlyIncome > 5000 ? 100 : 0))
            },
            trace_id: crypto.randomUUID(),
        }
    });
}
