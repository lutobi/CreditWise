/**
 * AVS (Account Verification Service) API Route
 * 
 * Verifies bank account details before loan submission.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { FEATURES } from '@/lib/feature-flags';
import { realpayClient } from '@/lib/realpay-client';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    // Check if AVS is enabled
    if (!FEATURES.REALPAY_AVS) {
        return NextResponse.json(
            { success: false, error: 'Account verification is not enabled' },
            { status: 503 }
        );
    }

    try {
        // Auth check
        const cookieStore = await cookies();
        const authClient = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll(); }
                }
            }
        );

        const { data: { session } } = await authClient.auth.getSession();
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { bankCode, accountNumber, idNumber, accountHolderName, loanId } = await req.json();

        if (!bankCode || !accountNumber || !idNumber) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: bankCode, accountNumber, idNumber' },
                { status: 400 }
            );
        }

        // Call Realpay AVS
        const result = await realpayClient.verifyAccount({
            bankCode,
            accountNumber,
            idNumber,
            accountHolderName,
        });

        // Log to database (using service role)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        await supabase.from('realpay_avs_checks').insert({
            user_id: session.user.id,
            loan_id: loanId || null,
            bank_code: bankCode,
            account_number_hash: createHash('sha256').update(accountNumber).digest('hex'),
            id_number_hash: createHash('sha256').update(idNumber).digest('hex'),
            status: result.status,
            match_score: result.matchScore,
            account_valid: result.details?.accountValid,
            name_match: result.details?.nameMatch,
            id_match: result.details?.idMatch,
            account_type: result.details?.accountType,
            error_code: result.errorCode,
            error_message: result.error,
        });

        // Return result (without sensitive details)
        return NextResponse.json({
            success: result.success,
            status: result.status,
            verified: result.status === 'verified',
            matchScore: result.matchScore,
            details: {
                accountValid: result.details?.accountValid,
                nameMatch: result.details?.nameMatch,
                idMatch: result.details?.idMatch,
            },
            error: result.error,
        });

    } catch (error: any) {
        console.error('[AVS Verify] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
