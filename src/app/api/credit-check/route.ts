
import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock Credit Engine
 * Simulates a credit bureau lookup.
 * Returns deterministic data based on the National ID hash.
 */

interface CreditReport {
    nationalId: string;
    score: number; // 300 - 850
    riskBand: 'Very High' | 'High' | 'Medium' | 'Low' | 'Very Low';
    summary: {
        totalDebt: number;
        activeAccounts: number;
        overdueAccounts: number;
        enquiriesLast6Months: number;
    };
    history: Array<{
        provider: string;
        type: string; // Personal Loan, Auto Loan, Credit Card
        status: 'Active' | 'Paid' | 'Defaulted';
        balance: number;
    }>;
    habits: string[]; // e.g. "Good Payer", "High Utilization"
}

export async function POST(req: NextRequest) {
    try {
        const { nationalId } = await req.json();

        if (!nationalId) {
            return NextResponse.json({ success: false, error: 'National ID is required' }, { status: 400 });
        }

        // Deterministic seeding based on National ID numeric values
        const seed = nationalId.split('').reduce((acc: number, char: string) => acc + (parseInt(char) || 0), 0);

        // Generate Score (300 + (seed * 7) % 550) -> typically between 300 and 850
        // We want a realistic spread. 
        // Let's make it a bit random looking but deterministic.
        const baseScore = 300;
        const variable = (seed * 137) % 551;
        const score = baseScore + variable;

        // Determine Risk Band
        let riskBand = 'Medium';
        if (score < 500) riskBand = 'Very High';
        else if (score < 600) riskBand = 'High';
        else if (score < 660) riskBand = 'Medium';
        else if (score < 720) riskBand = 'Low';
        else riskBand = 'Very Low';

        // Habits & Flags based on score
        const habits = [];
        if (score > 700) habits.push('Consistent Payer');
        if (score < 550) habits.push('Recent Defaults');
        if (seed % 2 === 0) habits.push('Frequent Borrower');
        if (seed % 3 === 0) habits.push('High Utilization');
        if (score > 600 && seed % 2 !== 0) habits.push('Long Credit History');

        // External Loans (Mock)
        const possibleProviders = ['Standard Bank', 'FNB Namibia', 'Nedbank', 'Letshego', 'Bank Windhoek'];
        const possibleTypes = ['Personal Loan', 'Auto Loan', 'Credit Card', 'Overdraft'];

        const history = [];
        // Number of accounts based on seed
        const numAccounts = (seed % 4) + 1; // 1 to 4 accounts

        for (let i = 0; i < numAccounts; i++) {
            // specific sub-seed for each account
            const accSeed = seed + i;
            history.push({
                provider: possibleProviders[accSeed % possibleProviders.length],
                type: possibleTypes[accSeed % possibleTypes.length],
                status: score > 600 ? (accSeed % 3 === 0 ? 'Paid' : 'Active') : (accSeed % 3 === 0 ? 'Defaulted' : 'Active'),
                balance: (accSeed * 1000) % 50000
            });
        }

        const report: CreditReport = {
            nationalId,
            score,
            riskBand: riskBand as any,
            summary: {
                totalDebt: history.reduce((acc, item) => item.status === 'Active' ? acc + item.balance : acc, 0),
                activeAccounts: history.filter(h => h.status === 'Active').length,
                overdueAccounts: history.filter(h => h.status === 'Defaulted').length,
                enquiriesLast6Months: seed % 5 // 0 to 4
            },
            history,
            habits
        };

        return NextResponse.json({ success: true, data: report });

    } catch (error: any) {
        console.error('Credit Check API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
