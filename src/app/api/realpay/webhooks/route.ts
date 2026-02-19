/**
 * Realpay Webhook Receiver API Route
 * 
 * Handles incoming webhook events from Realpay.
 * Verifies signatures and processes events accordingly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { REALPAY_CONFIG, FEATURES } from '@/lib/feature-flags';
import type { WebhookPayload, WebhookEventType } from '@/lib/realpay-types';

export const dynamic = 'force-dynamic';

// ============================================
// Signature Verification
// ============================================

function verifyWebhookSignature(payload: string, signature: string, timestamp: string): boolean {
    // In mock mode, accept 'mock_webhook_secret' or skip verification
    if (REALPAY_CONFIG.API_URL.includes('localhost')) {
        return true;
    }

    const expectedSignature = createHmac('sha256', REALPAY_CONFIG.WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

    // Timing-safe comparison
    return timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

// ============================================
// Main Handler
// ============================================

export async function POST(req: NextRequest) {
    // Check if Realpay is enabled
    if (!FEATURES.REALPAY_ENABLED) {
        return NextResponse.json(
            { success: false, error: 'Realpay integration is disabled' },
            { status: 503 }
        );
    }

    try {
        const rawBody = await req.text();
        const signature = req.headers.get('X-Realpay-Signature') || '';
        const timestamp = req.headers.get('X-Realpay-Timestamp') || '';

        // Verify signature
        if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
            console.error('[Realpay Webhook] Invalid signature');
            return NextResponse.json(
                { success: false, error: 'Invalid signature' },
                { status: 401 }
            );
        }

        const payload: WebhookPayload = JSON.parse(rawBody);
        const { event } = payload;

        console.log(`[Realpay Webhook] Received: ${event.type}`, event.id);

        // Initialize Supabase (service role for full access)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Log webhook to database
        const { data: webhookRecord, error: logError } = await supabase
            .from('realpay_webhooks')
            .insert({
                event_type: event.type,
                event_id: event.id,
                payload: event,
                headers: {
                    signature: signature.substring(0, 20) + '...',
                    timestamp,
                },
            })
            .select()
            .single();

        if (logError) {
            console.error('[Realpay Webhook] Failed to log webhook:', logError);
        }

        // Process event based on type
        const result = await processWebhookEvent(supabase, event);

        // Mark webhook as processed
        if (webhookRecord) {
            await supabase
                .from('realpay_webhooks')
                .update({
                    processed: true,
                    processed_at: new Date().toISOString(),
                    processing_error: result.error || null,
                    mandate_id: result.mandateId || null,
                    transaction_id: result.transactionId || null,
                })
                .eq('id', webhookRecord.id);
        }

        return NextResponse.json({ success: true, received: event.type });

    } catch (error: any) {
        console.error('[Realpay Webhook] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// ============================================
// Event Processors
// ============================================

interface ProcessResult {
    success: boolean;
    mandateId?: string;
    transactionId?: string;
    error?: string;
}

async function processWebhookEvent(
    supabase: any,
    event: WebhookPayload['event']
): Promise<ProcessResult> {
    const { type, data } = event;

    try {
        switch (type) {
            case 'mandate.approved':
                return await handleMandateApproved(supabase, data);

            case 'mandate.rejected':
                return await handleMandateRejected(supabase, data);

            case 'mandate.cancelled':
                return await handleMandateCancelled(supabase, data);

            case 'collection.success':
                return await handleCollectionSuccess(supabase, data);

            case 'collection.failed':
                return await handleCollectionFailed(supabase, data);

            case 'payout.success':
                return await handlePayoutSuccess(supabase, data);

            case 'payout.failed':
                return await handlePayoutFailed(supabase, data);

            default:
                console.log(`[Realpay Webhook] Unhandled event type: ${type}`);
                return { success: true };
        }
    } catch (error: any) {
        console.error(`[Realpay Webhook] Error processing ${type}:`, error);
        return { success: false, error: error.message };
    }
}

// ============================================
// Mandate Handlers
// ============================================

async function handleMandateApproved(supabase: any, data: any): Promise<ProcessResult> {
    const { mandateReference, amount, collectionDay } = data;

    const { data: mandate, error } = await supabase
        .from('realpay_mandates')
        .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
        })
        .eq('mandate_reference', mandateReference)
        .select()
        .single();

    if (error) throw error;

    // TODO: Trigger auto-payout if enabled
    // TODO: Send notification to user

    return { success: true, mandateId: mandate.id };
}

async function handleMandateRejected(supabase: any, data: any): Promise<ProcessResult> {
    const { mandateReference, failureCode, failureReason } = data;

    const { data: mandate, error } = await supabase
        .from('realpay_mandates')
        .update({
            status: 'rejected',
            last_error: `${failureCode}: ${failureReason}`,
            retry_count: supabase.sql`retry_count + 1`,
        })
        .eq('mandate_reference', mandateReference)
        .select()
        .single();

    if (error) throw error;

    // TODO: Send notification to user about rejection

    return { success: true, mandateId: mandate.id };
}

async function handleMandateCancelled(supabase: any, data: any): Promise<ProcessResult> {
    const { mandateReference } = data;

    const { data: mandate, error } = await supabase
        .from('realpay_mandates')
        .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
        })
        .eq('mandate_reference', mandateReference)
        .select()
        .single();

    if (error) throw error;

    return { success: true, mandateId: mandate.id };
}

// ============================================
// Collection Handlers
// ============================================

async function handleCollectionSuccess(supabase: any, data: any): Promise<ProcessResult> {
    const { mandateReference, transactionReference, amount, settledAt } = data;

    // Get mandate to find loan
    const { data: mandate } = await supabase
        .from('realpay_mandates')
        .select('id, loan_id')
        .eq('mandate_reference', mandateReference)
        .single();

    if (!mandate) throw new Error('Mandate not found');

    // Record transaction
    const { data: transaction, error } = await supabase
        .from('realpay_transactions')
        .insert({
            mandate_id: mandate.id,
            loan_id: mandate.loan_id,
            type: 'collection',
            amount,
            status: 'success',
            realpay_ref: transactionReference,
            settled_at: settledAt,
        })
        .select()
        .single();

    if (error) throw error;

    // TODO: Update loan balance
    // TODO: Record in repayments table
    // TODO: Send receipt to user

    return { success: true, mandateId: mandate.id, transactionId: transaction.id };
}

async function handleCollectionFailed(supabase: any, data: any): Promise<ProcessResult> {
    const { mandateReference, transactionReference, amount, failureCode, failureReason, nextRetryDate } = data;

    const { data: mandate } = await supabase
        .from('realpay_mandates')
        .select('id, loan_id')
        .eq('mandate_reference', mandateReference)
        .single();

    if (!mandate) throw new Error('Mandate not found');

    const { data: transaction, error } = await supabase
        .from('realpay_transactions')
        .insert({
            mandate_id: mandate.id,
            loan_id: mandate.loan_id,
            type: 'collection',
            amount,
            status: 'failed',
            realpay_ref: transactionReference,
            failure_code: failureCode,
            failure_reason: failureReason,
            next_retry_at: nextRetryDate,
        })
        .select()
        .single();

    if (error) throw error;

    // TODO: Send failed payment notification to user
    // TODO: Flag loan in admin dashboard

    return { success: true, mandateId: mandate.id, transactionId: transaction.id };
}

// ============================================
// Payout Handlers
// ============================================

async function handlePayoutSuccess(supabase: any, data: any): Promise<ProcessResult> {
    const { transactionReference, amount, settledAt } = data;

    const { data: transaction, error } = await supabase
        .from('realpay_transactions')
        .update({
            status: 'success',
            settled_at: settledAt,
        })
        .eq('realpay_ref', transactionReference)
        .select()
        .single();

    if (error) throw error;

    // Update loan status to disbursed
    if (transaction?.loan_id) {
        await supabase
            .from('loans')
            .update({ status: 'disbursed' })
            .eq('id', transaction.loan_id);
    }

    // TODO: Send disbursement confirmation to user

    return { success: true, transactionId: transaction?.id };
}

async function handlePayoutFailed(supabase: any, data: any): Promise<ProcessResult> {
    const { transactionReference, failureCode, failureReason } = data;

    const { data: transaction, error } = await supabase
        .from('realpay_transactions')
        .update({
            status: 'failed',
            failure_code: failureCode,
            failure_reason: failureReason,
        })
        .eq('realpay_ref', transactionReference)
        .select()
        .single();

    if (error) throw error;

    // TODO: Alert admin about failed payout

    return { success: true, transactionId: transaction?.id };
}
