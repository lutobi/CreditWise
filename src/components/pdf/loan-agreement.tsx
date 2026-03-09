import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { OmariLetterhead } from './omari-letterhead';

const styles = StyleSheet.create({
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 24,
        color: '#000000',
    },
    preamble: {
        fontSize: 8,
        fontStyle: 'italic',
        marginBottom: 16,
        color: '#475569',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
        color: '#000000',
    },
    textRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    label: {
        width: 150,
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    value: {
        flex: 1,
        fontSize: 10,
        color: '#334155',
    },
    textBlock: {
        fontSize: 9,
        marginBottom: 8,
        lineHeight: 1.4,
        color: '#334155',
    },
    tableLine: {
        borderBottomWidth: 1,
        borderBottomColor: '#cbd5e1',
        marginVertical: 4,
    },
    signatureBlock: {
        marginTop: 40,
    },
    signatureLine: {
        width: 200,
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        marginBottom: 4,
    },
    signatureText: {
        fontSize: 10,
        color: '#334155',
    },
    signatureLabel: {
        fontSize: 8,
        color: '#64748b',
        marginTop: 2,
    },
    signArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
    },
    annexureBox: {
        borderWidth: 1,
        borderColor: '#000000',
        padding: 12,
        marginTop: 16,
    }
});

interface LoanAgreementProps {
    loan: any;
    profile: any;
}

export const LoanAgreementDocument = ({ loan, profile }: LoanAgreementProps) => {
    // Financial Calcs
    const principal = Number(loan?.amount) || 0;
    const interestRate = 0.25; // 25% fixed rate
    const interestAmount = principal * interestRate;
    const initiationFee = 0;
    const serviceFee = 0;
    const totalRepay = principal + interestAmount + initiationFee + serviceFee;

    // Dates
    const startDate = loan?.approved_at ? new Date(loan.approved_at) : new Date();
    const repaymentDate = new Date(startDate);
    repaymentDate.setMonth(repaymentDate.getMonth() + 1);

    const formatDate = (d: Date) => {
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <OmariLetterhead>
            <Text style={styles.title}>LOAN AGREEMENT</Text>

            <Text style={styles.preamble}>
                IMPORTANT: This loan agreement is subject to the Financial Institutions and Markets Act.
                The maximum term for a micro-loan is limited to 60 months, but this specific short-term facility is limited to 1 month.
                Penalties for late payment are strictly regulated.
            </Text>

            {/* --- Parties --- */}
            <Text style={styles.sectionTitle}>1. PARTIES</Text>
            <View style={{ marginBottom: 16 }}>
                <View style={styles.textRow}>
                    <Text style={styles.label}>Lender:</Text>
                    <Text style={styles.value}>OMARI FINANCE (PTY) LTD</Text>
                </View>
                <View style={styles.textRow}>
                    <Text style={styles.label}>Address:</Text>
                    <Text style={styles.value}>1129 Nangolo Mbumba Road, Walvis Bay, Namibia</Text>
                </View>
            </View>

            <View style={{ marginBottom: 16 }}>
                <Text style={[styles.label, { marginBottom: 4 }]}>Borrower Details:</Text>
                <View style={styles.textRow}>
                    <Text style={styles.label}>Name:</Text>
                    <Text style={styles.value}>{profile?.first_name} {profile?.last_name}</Text>
                </View>
                <View style={styles.textRow}>
                    <Text style={styles.label}>ID / Passport:</Text>
                    <Text style={styles.value}>{profile?.id_number || 'N/A'}</Text>
                </View>
                <View style={styles.textRow}>
                    <Text style={styles.label}>Mobile:</Text>
                    <Text style={styles.value}>{profile?.phone_number || 'N/A'}</Text>
                </View>
                <View style={styles.textRow}>
                    <Text style={styles.label}>Email:</Text>
                    <Text style={styles.value}>{profile?.email || 'N/A'}</Text>
                </View>
            </View>

            {/* --- Financial Schedule --- */}
            <Text style={styles.sectionTitle}>2. LOAN SCHEDULE & REPAYMENT TERMS</Text>
            <View style={styles.tableLine} />
            <View style={styles.textRow}>
                <Text style={styles.label}>Capital Amount (Principal):</Text>
                <Text style={[styles.value, { textAlign: 'right' }]}>N$ {principal.toFixed(2)}</Text>
            </View>
            <View style={styles.textRow}>
                <Text style={styles.label}>Interest ({(interestRate * 100).toFixed(0)}% fixed):</Text>
                <Text style={[styles.value, { textAlign: 'right' }]}>N$ {interestAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.textRow}>
                <Text style={styles.label}>Initiation Fee:</Text>
                <Text style={[styles.value, { textAlign: 'right' }]}>N$ {initiationFee.toFixed(2)}</Text>
            </View>
            <View style={styles.textRow}>
                <Text style={styles.label}>Service Fee:</Text>
                <Text style={[styles.value, { textAlign: 'right' }]}>N$ {serviceFee.toFixed(2)}</Text>
            </View>
            <View style={styles.tableLine} />
            <View style={styles.textRow}>
                <Text style={[styles.label, { fontWeight: 'bold' }]}>TOTAL REPAYABLE:</Text>
                <Text style={[styles.value, { textAlign: 'right', fontWeight: 'bold' }]}>N$ {totalRepay.toFixed(2)}</Text>
            </View>
            <View style={styles.textRow}>
                <Text style={[styles.label, { fontWeight: 'bold' }]}>Repayment Due Date:</Text>
                <Text style={[styles.value, { textAlign: 'right', fontWeight: 'bold' }]}>{formatDate(repaymentDate)}</Text>
            </View>

            <View style={{ marginBottom: 24 }} />

            {/* --- Terms & Conditions --- */}
            <Text style={styles.sectionTitle}>3. TERMS AND CONDITIONS</Text>
            <View>
                <Text style={[styles.textBlock, { fontWeight: 'bold' }]}>3.1. Repayment</Text>
                <Text style={styles.textBlock}>The Borrower agrees to repay the Total Repayable Amount on or before the Repayment Due Date. Repayment shall be made via deduction at source, electronic funds transfer, or debit order as authorized.</Text>

                <Text style={[styles.textBlock, { fontWeight: 'bold' }]}>3.2. Interest & Fees</Text>
                <Text style={styles.textBlock}>Interest is calculated at a fixed rate of {(interestRate * 100).toFixed(0)}% for the period. The Borrower acknowledges that this rate is consistent with the short-term risk profile and administrative costs.</Text>

                <Text style={[styles.textBlock, { fontWeight: 'bold' }]}>3.3. Penalty Interest (NAMFISA Regulation)</Text>
                <Text style={styles.textBlock}>Should the Borrower fail to pay any amount due on the Due Date, the Lender shall be entitled to charge penalty interest on all overdue amounts at a rate not exceeding 5% per month. Such penalty interest shall not accrue for a period exceeding three (3) months, nor shall it exceed the capital amount of the loan in total.</Text>

                <Text style={[styles.textBlock, { fontWeight: 'bold' }]}>3.4. Allocation of Payments</Text>
                <Text style={styles.textBlock}>Payments received from the Borrower shall be allocated in the following order: (1) Due or unpaid interest, (2) Fees and charges, and (3) The principal capital amount.</Text>

                <Text style={[styles.textBlock, { fontWeight: 'bold' }]}>3.5. Default & Acceleration</Text>
                <Text style={styles.textBlock}>In the event of default, the outstanding balance becomes immediately due and payable. The Borrower shall be liable for all legal costs on an attorney-and-client scale incurred in recovering amounts due.</Text>

                <Text style={[styles.textBlock, { fontWeight: 'bold' }]}>3.6. Cooling-Off Period</Text>
                <Text style={styles.textBlock}>The Borrower has a right to cancel this agreement within three (3) business days of signing, provided the principal amount is returned in full along with any pro-rata interest accrued only for the days the money was held.</Text>

                <Text style={[styles.textBlock, { fontWeight: 'bold' }]}>3.7. Dispute Resolution</Text>
                <Text style={styles.textBlock}>Any dispute arising from this agreement shall first be referred to the Lender's internal compliance officer. If unresolved, the Borrower may direct complaints to NAMFISA. See Annexure A.</Text>
            </View>

            {/* --- Signatures --- */}
            <View style={styles.signatureBlock} wrap={false}>
                <Text style={styles.sectionTitle}>4. DECLARATION & SIGNATURE</Text>
                <Text style={styles.textBlock}>
                    I, the undersigned Borrower, hereby acknowledge that I have read and understood the terms of this agreement, including the financial schedule and the implications of default. I acknowledge that this agreement was completed prior to my signature.
                </Text>

                <View style={{ marginTop: 32 }} />

                <View style={styles.signArea}>
                    <View>
                        <Text style={[styles.signatureText, { fontWeight: 'bold', marginBottom: 24 }]}>Signed by BORROWER:</Text>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureText}>{profile?.first_name} {profile?.last_name}</Text>
                        <Text style={styles.signatureLabel}>(Digitally Signed)</Text>
                    </View>
                    <View>
                        <Text style={[styles.signatureText, { fontWeight: 'bold', marginBottom: 24 }]}>Date:</Text>
                        <Text style={styles.signatureText}>{formatDate(new Date())}</Text>
                    </View>
                </View>

                <View style={{ marginTop: 48 }} />

                <View style={styles.signArea}>
                    <View>
                        <Text style={[styles.signatureText, { fontWeight: 'bold', marginBottom: 24 }]}>For OMARI FINANCE:</Text>
                        <View style={styles.signatureLine} />
                        <Text style={styles.signatureLabel}>Authorized Signatory</Text>
                    </View>
                </View>
            </View>

            {/* --- Annexure A: Complaint Form --- */}
            {/* Force page break for annexure */}
            <View break>
                <Text style={styles.sectionTitle}>ANNEXURE A</Text>
                <Text style={styles.title}>COMPLAINT / DISPUTE RESOLUTION PROCEDURE</Text>

                <Text style={styles.textBlock}>
                    If you have a complaint regarding this loan agreement or the conduct of Omari Finance, please follow these steps:
                </Text>

                <View style={{ marginLeft: 16, marginTop: 8 }}>
                    <Text style={styles.textBlock}>1. Internal Resolution: Contact our support team at loans@omarifinance.com or visit our branch. We are committed to resolving issues within 7 business days.</Text>
                    <Text style={styles.textBlock}>2. Escalation: If you are unsatisfied with the outcome, you may escalate the matter to our Senior Compliance Officer.</Text>
                    <Text style={styles.textBlock}>3. NAMFISA: If the matter remains unresolved after 30 days, you have the right to lodge a complaint with the Namibia Financial Institutions Supervisory Authority (NAMFISA).</Text>
                </View>

                <View style={styles.annexureBox}>
                    <Text style={[styles.textBlock, { fontWeight: 'bold' }]}>NAMFISA Contact Details:</Text>
                    <Text style={styles.textBlock}>Phone: +264 61 290 5000</Text>
                    <Text style={styles.textBlock}>Email: complaints@namfisa.com.na</Text>
                    <Text style={styles.textBlock}>Address: 1st Floor, Sanlam Centre, Independence Ave, Windhoek</Text>
                </View>
            </View>

        </OmariLetterhead>
    );
};
