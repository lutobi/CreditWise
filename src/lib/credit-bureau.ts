export interface CreditBureauCheckResult {
    success: boolean;
    spikeDetected: boolean;
    inquiriesLast7Days: number;
    message: string;
}

export const creditBureau = {
    /**
     * Simulates a check against a credit bureau like Compuscan.
     * In production, this would make an HTTPS rest call to the bureau's API.
     */
    async checkRecentInquiries(nationalId: string): Promise<CreditBureauCheckResult> {
        console.log(`[Credit Bureau] Pinging Compuscan for ID: ${nationalId}`);

        // MOCK LOGIC: Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // MOCK LOGIC: We'll use the ID string length or specific patterns to trigger a spike for testing
        // Any ID ending in '99' will trigger a desperation spike.
        const isDesperationSpike = nationalId.endsWith('99');
        const inquiries = isDesperationSpike ? 5 : 1;

        if (isDesperationSpike) {
            console.warn(`[Credit Bureau] 🚨 ALERT: Desperation Spike detected for ${nationalId} (${inquiries} inquiries in 7 days).`);
            return {
                success: true,
                spikeDetected: true,
                inquiriesLast7Days: inquiries,
                message: "Multiple recent inquiries detected warning of high default risk."
            };
        }

        return {
            success: true,
            spikeDetected: false,
            inquiriesLast7Days: inquiries,
            message: "Credit behavior appears normal."
        };
    }
}
