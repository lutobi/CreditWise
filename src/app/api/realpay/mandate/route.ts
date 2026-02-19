/**
 * DebiCheck Mandate Creation API Route
 * 
 * Creates a new DebiCheck mandate for loan repayments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { FEATURES } from '@/lib/feature-flags';
import { realpayClient } from '@/lib/realpay-client';
import { logger } from '@/lib/safe-logger';
import { validateCSRF } from '@/lib/csrf';
import { realpayMandateSchema } from '@/lib/validation';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    // 0. CSRF Protection
    const csrf = await validateCSRF(req);
    if (!csrf.valid) {
        return NextResponse.json({ success: false, error: csrf.error }, { status: 403 });
    }

    // Check if DebiCheck is enabled
    // Check if DebiCheck is enabled
    if (!FEATURES.REALPAY_DEBICHECK) {
        return NextResponse.json(
            { success: false, error: 'DebiCheck is not enabled' },
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

        const rawBody = await req.json();
        const validation = realpayMandateSchema.safeParse(rawBody);

        if (!validation.success) {
            logger.warn('Mandate validation failed', { issues: validation.error.issues });
            return NextResponse.json({
                success: false,
                error: 'Invalid request data',
                details: validation.error.issues
            }, { status: 400 });
        }

        const {
            loanId,
            amount,
            collectionDay,
            bankCode,
            accountNumber,
            accountType,
            idNumber,
            accountHolderName
        } = validation.data;

        // Service role Supabase for database operations
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Verify loan belongs to user
        const { data: loan, error: loanError } = await supabase
            .from('loans')
            .select('id, user_id, status')
            .eq('id', loanId)
            .single();

        if (loanError || !loan) {
            return NextResponse.json(
                { success: false, error: 'Loan not found' },
                { status: 404 }
            );
        }

        if (loan.user_id !== session.user.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized access to loan' },
                { status: 403 }
            );
        }

        // Check for existing active mandate
        const { data: existingMandate } = await supabase
            .from('realpay_mandates')
            .select('id, status')
            .eq('loan_id', loanId)
            .in('status', ['pending', 'approved'])
            .single();

        if (existingMandate) {
            return NextResponse.json(
                { success: false, error: 'Active mandate already exists for this loan', mandateId: existingMandate.id },
                { status: 409 }
            );
        }

        // Map UI account types to Realpay types
        const mappedAccountType: 'savings' | 'current' | 'transmission' =
            (accountType === 'Savings' || accountType === 'savings') ? 'savings' : 'current';

        // Create mandate with Realpay
        const result = await realpayClient.createMandate({
            loanId,
            amount,
            collectionDay,
            accountDetails: {
                bankCode,
                accountNumber,
                accountType: mappedAccountType,
                idNumber,
                accountHolderName: accountHolderName || '',
            },
        });

        if (!result.success || !result.mandateReference) {
            return NextResponse.json(
                { success: false, error: result.error || 'Failed to create mandate' },
                { status: 500 }
            );
        }

        // Store mandate in database
        const { data: mandate, error: insertError } = await supabase
            .from('realpay_mandates')
            .insert({
                loan_id: loanId,
                mandate_reference: result.mandateReference,
                status: 'pending',
                amount,
                collection_day: collectionDay,
                bank_code: bankCode,
                account_type: accountType || 'current',
            })
            .select()
            .single();

        if (insertError) {
            logger.error('[Mandate Create] DB insert error', { error: insertError, loanId });
            return NextResponse.json(
                { success: false, error: 'Failed to store mandate' },
                { status: 500 }
            );
        } else {
            // Log audit for successful mandate creation
            await logAudit(loanId, 'MANDATE_CREATED', {
                mandateId: mandate?.id,
                amount,
                bankCode
            }, session.user.id);
        }

        return NextResponse.json({
            success: true,
            mandateId: mandate.id,
            mandateReference: result.mandateReference,
            status: 'pending',
            message: 'Please check your phone for bank authorization',
        });

    } catch (error: any) {
        logger.error('[Mandate Create] Error', { error: error.message });
        return NextResponse.json(
            { success: false, error: 'Failed to create mandate' },
            { status: 500 }
        );
    }
}

// Get mandate status (for polling)
export async function GET(req: NextRequest) {
    if (!FEATURES.REALPAY_ENABLED) {
        return NextResponse.json(
            { success: false, error: 'Realpay is not enabled' },
            { status: 503 }
        );
    }

    try {
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

        const { searchParams } = new URL(req.url);
        const loanId = searchParams.get('loanId');
        const mandateId = searchParams.get('mandateId');

        if (!loanId && !mandateId) {
            return NextResponse.json(
                { success: false, error: 'loanId or mandateId required' },
                { status: 400 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        let query = supabase
            .from('realpay_mandates')
            .select('*');

        if (mandateId) {
            query = query.eq('id', mandateId);
        } else if (loanId) {
            query = query.eq('loan_id', loanId).order('created_at', { ascending: false }).limit(1);
        }

        const { data: mandate, error } = await query.single();

        if (error || !mandate) {
            return NextResponse.json(
                { success: false, error: 'Mandate not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            mandate: {
                id: mandate.id,
                status: mandate.status,
                amount: mandate.amount,
                collectionDay: mandate.collection_day,
                retryCount: mandate.retry_count,
                approvedAt: mandate.approved_at,
                createdAt: mandate.created_at,
            },
        });

    } catch (error: any) {
        logger.error('[Mandate Status] Error', { error: error.message });
        return NextResponse.json(
            { success: false, error: 'Failed to retrieve mandate status' },
            { status: 500 }
        );
    }
}
