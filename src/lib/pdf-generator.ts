
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function generateLoanAgreement(loan: any, profileData: any): Promise<Buffer> {
    // Handle if profile is returned as an array (Supabase Join quirk)
    const profile = Array.isArray(profileData) ? profileData[0] : profileData;

    // Calculate Terms
    const principal = Number(loan.amount) || 0;
    const interestRate = 0.25; // 25%
    const interestAmount = principal * interestRate;
    const initiationFee = 0;
    const serviceFee = 0;
    const totalRepay = principal + interestAmount + initiationFee + serviceFee;

    // Dates
    const startDate = loan.approved_at ? new Date(loan.approved_at) : new Date();
    const repaymentDate = new Date(startDate);
    repaymentDate.setMonth(repaymentDate.getMonth() + 1);

    const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const drawText = (text: string, x: number, y: number, size: number = 12, isBold: boolean = false) => {
        page.drawText(text, {
            x,
            y,
            size,
            font: isBold ? boldFont : font,
            color: rgb(0, 0, 0),
        });
    };

    let y = height - 50;

    // Header
    drawText('LOAN AGREEMENT', 50, y, 18, true);
    y -= 30;
    drawText('Made and entered into by and between:', 50, y, 10);
    y -= 20;

    // Parties
    drawText('LENDER:', 50, y, 10, true);
    drawText('OMARI FINANCE (PTY) LTD', 150, y);
    y -= 15;
    drawText('ADDRESS:', 50, y, 10, true);
    drawText('Windhoek, Namibia', 150, y);
    y -= 30;

    drawText('BORROWER:', 50, y, 10, true);
    drawText((profile?.full_name || 'Valued Client').toUpperCase(), 150, y);
    y -= 15;
    drawText('NATIONAL ID:', 50, y, 10, true);
    drawText(profile?.national_id || 'N/A', 150, y);
    y -= 15;
    drawText('ADDRESS:', 50, y, 10, true);
    drawText(loan?.application_data?.address || profile?.address || 'N/A', 150, y);
    y -= 40;

    // Particulars Table
    drawText('LOAN PARTICULARS', 50, y, 12, true);
    y -= 25;

    const drawRow = (label: string, value: string) => {
        drawText(label, 50, y, 10, true);
        drawText(value, 200, y, 10);
        y -= 20;
    };

    drawRow('Principal Debt:', `N$ ${principal.toFixed(2)}`);
    drawRow('Initiation Fee:', `N$ ${initiationFee.toFixed(2)}`);
    drawRow('Service Fee:', `N$ ${serviceFee.toFixed(2)}`);
    drawRow('Interest Rate:', `25% per month (Fixed)`);
    drawRow('Interest Amount:', `N$ ${interestAmount.toFixed(2)}`);

    y -= 10;
    drawText('TOTAL REPAYMENT:', 50, y, 11, true);
    drawText(`N$ ${totalRepay.toFixed(2)}`, 200, y, 11, true);
    y -= 25;

    drawRow('Repayment Date:', formatDate(repaymentDate));
    y -= 40;

    // Terms
    drawText('3. TERMS AND CONDITIONS', 50, y, 12, true);
    y -= 20;

    const terms = [
        '3.1. PAYMENT: The Borrower agrees to pay the Total Repayment amount on the Repayment Date',
        'duly without deduction or set-off.',
        '',
        '3.2. EARLY SETTLEMENT: The Borrower may settle the loan earlier than the Repayment Date',
        'without penalty. Interest will be calculated pro-rata if applicable laws allow, otherwise',
        'the fixed cost applies as per short-term lending norms.',
        '',
        '3.3. DEFAULT: Interest of 5% per month will be charged on all overdue amounts.',
        'The Borrower shall be liable for all tracing fees and legal costs on the scale as between',
        'attorney and client.',
        '',
        '3.4. JURISDICTION: This agreement is governed by the laws of the Republic of Namibia.',
        'The parties consent to the jurisdiction of the Magistrate\'s Court.',
        '',
        '3.5. ACKNOWLEDGEMENT: The Borrower acknowledges that they can afford this loan',
        'and that the information provided is true and correct.',
        '',
        '3.6. DEBIT ORDER MANDATE: The Borrower authorizes the Lender to issue payment instructions',
        'to the bank for collection against their account. These withdrawals will be processed',
        'through the Namibian banking system.'
    ];

    terms.forEach(line => {
        if (line === '') {
            y -= 10;
        } else {
            drawText(line, 50, y, 9);
            y -= 12;
        }
    });

    y -= 40;

    // Signatures
    drawText('4. ACCEPTANCE & SIGNATURE', 50, y, 12, true);
    y -= 30;

    drawText('Signed electronically by Borrower:', 50, y, 10);
    drawText(profile?.full_name || 'Borrower', 250, y, 10, true);
    y -= 20;

    drawText('Date of Acceptance:', 50, y, 10);
    drawText(formatDate(startDate), 250, y, 10);
    y -= 20;

    drawText('Digital Token / ID:', 50, y, 10);
    drawText(loan.id, 250, y, 8);
    y -= 40;

    drawText('------------------------------------------', 50, y);
    drawText('For and on behalf of OMARI FINANCE', 50, y - 15);

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}
