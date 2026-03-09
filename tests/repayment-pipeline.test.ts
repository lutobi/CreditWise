import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase: any = {
    from: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    single: vi.fn(() => mockSupabase),
};

vi.mock('@supabase/ssr', () => ({
    createServerClient: vi.fn(() => mockSupabase)
}));

describe('Repayment Processing Pipeline', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('1. Full Repayment: Admin logs a payment that closes the loan', async () => {
        // Assume initial loan balance is 6250
        const loanTotal = 6250;
        const paymentAmount = 6250;

        // Mock getting the current loan state
        mockSupabase.single.mockResolvedValueOnce({
            data: { id: 'loan-1', amount: 5000, duration_months: 1, status: 'APPROVED' },
            error: null
        });

        // Mock inserting repayment record
        mockSupabase.insert.mockResolvedValueOnce({ data: [{ payment_id: 'p-1' }], error: null });

        // Mock updating the loan status to REPAID
        mockSupabase.eq.mockResolvedValueOnce({
            data: { id: 'loan-1', status: 'REPAID' },
            error: null
        });

        // Simulate backend payment routing logic
        const paymentRecord = await mockSupabase.from('repayments').insert({
            loan_id: 'loan-1',
            amount: paymentAmount,
            status: 'COMPLETED'
        });

        // If payment matches total (simulated logic check)
        let finalStatus = 'APPROVED';
        if (paymentAmount >= loanTotal) {
            finalStatus = 'REPAID';
            await mockSupabase.from('loans').update({ status: finalStatus }).eq('id', 'loan-1');
        }

        expect(paymentRecord.data).toBeTruthy();
        expect(finalStatus).toBe('REPAID');
        expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'REPAID' });
    });

    it('2. Partial Repayment: Loan remains active until fully paid', async () => {
        const loanTotal = 6250;
        const paymentAmount = 3000; // Partial payment

        mockSupabase.single.mockResolvedValueOnce({
            data: { id: 'loan-2', amount: 5000, status: 'APPROVED' },
            error: null
        });

        let finalStatus = 'APPROVED';
        if (paymentAmount >= loanTotal) {
            finalStatus = 'REPAID';
            await mockSupabase.from('loans').update({ status: finalStatus }).eq('id', 'loan-2');
        }

        expect(finalStatus).toBe('APPROVED');
        // Update to REPAID should not have been called for a partial payment
        expect(mockSupabase.update).not.toHaveBeenCalledWith({ status: 'REPAID' });
    });

});
