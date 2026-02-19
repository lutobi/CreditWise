import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';

/**
 * Generates a NAMFISA-compliant Loan Agreement PDF
 */
export async function generateLoanAgreement(loan: any, profileData: any): Promise<Buffer> {
    // 1. Data Preparation
    // Handle Supabase join array quirks
    const profile = Array.isArray(profileData) ? profileData[0] : profileData;

    // Financial Calcs
    const principal = Number(loan.amount) || 0;
    const interestRate = 0.30; // 30% fixed rate
    const interestAmount = principal * interestRate;
    const initiationFee = 0; // Keeping simple for now
    const serviceFee = 0;
    const totalRepay = principal + interestAmount + initiationFee + serviceFee;

    // Dates
    const startDate = loan.approved_at ? new Date(loan.approved_at) : new Date();
    const repaymentDate = new Date(startDate);
    repaymentDate.setMonth(repaymentDate.getMonth() + 1);

    const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    // 2. PDF Initialization
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();

    // Margins & Layout
    const margin = 50;
    const contentWidth = width - (margin * 2);
    let yPosition = height - margin;

    // Fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSizeHeader = 16;
    const fontSizeSubHeader = 12;
    const fontSizeBody = 10;
    const fontSizeSmall = 8;

    // --- Helper Functions ---

    /**
     * Checks if we need a new page based on estimated height.
     * If so, adds page and resets yPosition.
     */
    const checkPageBreak = (neededHeight: number) => {
        if (yPosition - neededHeight < margin) {
            page = pdfDoc.addPage();
            yPosition = height - margin;
            return;
        }
    };

    /**
     * Draws text with automatic wrapping. Returns the new yPosition.
     */
    const drawWrappedText = (
        text: string,
        size: number = fontSizeBody,
        font: PDFFont = fontRegular,
        lineHeight: number = 14,
        indent: number = 0
    ) => {
        // Simple word wrap logic
        const words = text.split(' ');
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const textWidth = font.widthOfTextAtSize(testLine, size);

            if (textWidth > (contentWidth - indent)) {
                // Draw current line
                checkPageBreak(lineHeight);
                page.drawText(currentLine, {
                    x: margin + indent,
                    y: yPosition,
                    size,
                    font,
                    color: rgb(0, 0, 0),
                });
                yPosition -= lineHeight;
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        // Draw last line
        if (currentLine) {
            checkPageBreak(lineHeight);
            page.drawText(currentLine, {
                x: margin + indent,
                y: yPosition,
                size,
                font,
                color: rgb(0, 0, 0),
            });
            yPosition -= lineHeight;
        }
        yPosition -= 4; // Paragraph spacing
    };

    /**
     * Simple Key-Value pair drawer
     */
    const drawField = (label: string, value: string) => {
        checkPageBreak(14);
        page.drawText(label, { x: margin, y: yPosition, size: fontSizeBody, font: fontBold });
        page.drawText(value, { x: margin + 150, y: yPosition, size: fontSizeBody, font: fontRegular });
        yPosition -= 16;
    };

    /**
     * Drawer for the schedule table rows
     */
    const drawRow = (label: string, value: string, isBold = false) => {
        checkPageBreak(16);
        const f = isBold ? fontBold : fontRegular;
        page.drawText(label, { x: margin, y: yPosition, size: fontSizeBody, font: f });
        // Align value to right
        const valWidth = f.widthOfTextAtSize(value, fontSizeBody);
        page.drawText(value, { x: width - margin - valWidth, y: yPosition, size: fontSizeBody, font: f });
        yPosition -= 18;
    };


    // 3. Document Content

    // --- Title ---
    checkPageBreak(40);
    page.drawText('LOAN AGREEMENT', {
        x: width / 2 - fontBold.widthOfTextAtSize('LOAN AGREEMENT', fontSizeHeader) / 2,
        y: yPosition,
        size: fontSizeHeader,
        font: fontBold
    });
    yPosition -= 30;

    // --- Preamble Warning (NAMFISA Req) ---
    drawWrappedText(
        'IMPORTANT: This loan agreement is subject to the Financial Institutions and Markets Act. ' +
        'The maximum term for a micro-loan is limited to 60 months, but this specific short-term facility is limited to 1 month. ' +
        'Penalties for late payment are strictly regulated.',
        fontSizeSmall, fontBold
    );
    yPosition -= 10;

    // --- Parties ---
    drawWrappedText('1. PARTIES', fontSizeSubHeader, fontBold);

    // Lender
    drawWrappedText('Lender: OMARI FINANCE (PTY) LTD', fontSizeBody, fontBold, 14, 10);
    drawWrappedText('Address: 123 Independence Avenue, Windhoek, Namibia', fontSizeBody, fontRegular, 14, 10);
    yPosition -= 5;

    // Borrower
    drawWrappedText('Borrower Details:', fontSizeBody, fontBold, 14, 10);
    drawField('Name:', `${profile.first_name} ${profile.last_name}`);
    drawField('ID / Passport:', profile.id_number || 'N/A');
    drawField('Mobile:', profile.phone_number || 'N/A');
    drawField('Email:', profile.email || 'N/A');
    yPosition -= 15;

    // --- Financial Schedule ---
    drawWrappedText('2. LOAN SCHEDULE & REPAYMENT TERMS', fontSizeSubHeader, fontBold);

    // Draw Table Header
    yPosition -= 5;
    page.drawLine({ start: { x: margin, y: yPosition + 12 }, end: { x: width - margin, y: yPosition + 12 }, thickness: 1 });

    drawRow('Capital Amount (Principal):', `N$ ${principal.toFixed(2)}`);
    drawRow('Interest (30% fixed):', `N$ ${interestAmount.toFixed(2)}`);
    drawRow('Initiation Fee:', `N$ ${initiationFee.toFixed(2)}`);
    drawRow('Service Fee:', `N$ ${serviceFee.toFixed(2)}`);

    page.drawLine({ start: { x: margin, y: yPosition + 12 }, end: { x: width - margin, y: yPosition + 12 }, thickness: 1 });
    yPosition -= 5;

    drawRow('TOTAL REPAYABLE:', `N$ ${totalRepay.toFixed(2)}`, true);
    drawRow('Repayment Due Date:', formatDate(repaymentDate), true);

    yPosition -= 20;

    // --- Terms & Conditions ---
    drawWrappedText('3. TERMS AND CONDITIONS', fontSizeSubHeader, fontBold);

    const terms = [
        {
            title: '3.1. Repayment',
            body: 'The Borrower agrees to repay the Total Repayable Amount on or before the Repayment Due Date. Repayment shall be made via deduction at source, electronic funds transfer, or debit order as authorized.'
        },
        {
            title: '3.2. Interest & Fees',
            body: `Interest is calculated at a fixed rate of ${(interestRate * 100).toFixed(0)}% for the period. The Borrower acknowledges that this rate is consistent with the short-term risk profile and administrative costs.`
        },
        {
            title: '3.3. Penalty Interest (NAMFISA Regulation)',
            body: 'Should the Borrower fail to pay any amount due on the Due Date, the Lender shall be entitled to charge penalty interest on all overdue amounts at a rate not exceeding 5% per month. Such penalty interest shall not accrue for a period exceeding three (3) months, nor shall it exceed the capital amount of the loan in total.'
        },
        {
            title: '3.4. Allocation of Payments',
            body: 'Payments received from the Borrower shall be allocated in the following order: (1) Due or unpaid interest, (2) Fees and charges, and (3) The principal capital amount.'
        },
        {
            title: '3.5. Default & Acceleration',
            body: 'In the event of default, the outstanding balance becomes immediately due and payable. The Borrower shall be liable for all legal costs on an attorney-and-client scale incurred in recovering amounts due.'
        },
        {
            title: '3.6. Cooling-Off Period',
            body: 'The Borrower has a right to cancel this agreement within three (3) business days of signing, provided the principal amount is returned in full along with any pro-rata interest accrued only for the days the money was held.'
        },
        {
            title: '3.7. Dispute Resolution',
            body: 'Any dispute arising from this agreement shall first be referred to the Lender\'s internal compliance officer. If unresolved, the Borrower may direct complaints to NAMFISA. See Annexure A.'
        }
    ];

    terms.forEach(term => {
        drawWrappedText(term.title, fontSizeBody, fontBold, 14, 0);
        drawWrappedText(term.body, fontSizeBody, fontRegular, 14, 10);
    });

    yPosition -= 10;

    // --- Signatures ---
    checkPageBreak(120);
    drawWrappedText('4. DECLARATION & SIGNATURE', fontSizeSubHeader, fontBold);
    drawWrappedText(
        'I, the undersigned Borrower, hereby acknowledge that I have read and understood the terms of this agreement, including the financial schedule and the implications of default. I acknowledge that this agreement was completed prior to my signature.',
        fontSizeSmall, fontRegular
    );

    yPosition -= 30;

    // Borrower Signature
    page.drawText('Signed by BORROWER:', { x: margin, y: yPosition, size: fontSizeBody, font: fontBold });
    page.drawLine({ start: { x: margin, y: yPosition - 30 }, end: { x: margin + 200, y: yPosition - 30 }, thickness: 1 });
    page.drawText(`${profile.first_name} ${profile.last_name}`, { x: margin, y: yPosition - 25, size: 14, font: fontRegular });
    page.drawText('(Digitally Signed)', { x: margin, y: yPosition - 40, size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });

    // Date
    page.drawText('Date:', { x: margin + 250, y: yPosition, size: fontSizeBody, font: fontBold });
    page.drawText(formatDate(new Date()), { x: margin + 290, y: yPosition, size: fontSizeBody, font: fontRegular });

    yPosition -= 70;

    // Lender Signature
    page.drawText('For OMARI FINANCE:', { x: margin, y: yPosition, size: fontSizeBody, font: fontBold });
    page.drawLine({ start: { x: margin, y: yPosition - 30 }, end: { x: margin + 200, y: yPosition - 30 }, thickness: 1 });
    page.drawText('Authorized Signatory', { x: margin, y: yPosition - 45, size: fontSizeSmall, font: fontRegular });


    // --- Annexure A: Complaint Form ---
    // Start new page for Annexure
    page = pdfDoc.addPage();
    width = page.getSize().width;
    height = page.getSize().height;
    yPosition = height - margin;

    // Annexure Header
    page.drawText('ANNEXURE A', { x: margin, y: yPosition, size: fontSizeSubHeader, font: fontBold });
    yPosition -= 20;
    page.drawText('COMPLAINT / DISPUTE RESOLUTION PROCEDURE', { x: margin, y: yPosition, size: fontSizeHeader, font: fontBold });
    yPosition -= 40;

    drawWrappedText(
        'If you have a complaint regarding this loan agreement or the conduct of Omari Finance, please follow these steps:',
        fontSizeBody, fontRegular
    );

    const steps = [
        '1. Internal Resolution: Contact our support team at disputes@omari.com.na or visit our branch. We are committed to resolving issues within 7 business days.',
        '2. Escalation: If you are unsatisfied with the outcome, you may escalate the matter to our Senior Compliance Officer.',
        '3. NAMFISA: If the matter remains unresolved after 30 days, you have the right to lodge a complaint with the Namibia Financial Institutions Supervisory Authority (NAMFISA).'
    ];

    steps.forEach(step => {
        drawWrappedText(step, fontSizeBody, fontRegular, 16, 10);
    });

    yPosition -= 30;

    // NAMFISA Contact Details Box
    page.drawRectangle({
        x: margin,
        y: yPosition - 80,
        width: contentWidth,
        height: 80,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
    });

    const contactY = yPosition - 20;
    page.drawText('NAMFISA Contact Details:', { x: margin + 10, y: contactY, size: fontSizeBody, font: fontBold });
    page.drawText('Phone: +264 61 290 5000', { x: margin + 10, y: contactY - 15, size: fontSizeBody, font: fontRegular });
    page.drawText('Email: complaints@namfisa.com.na', { x: margin + 10, y: contactY - 30, size: fontSizeBody, font: fontRegular });
    page.drawText('Address: 1st Floor, Sanlam Centre, Independence Ave, Windhoek', { x: margin + 10, y: contactY - 45, size: fontSizeBody, font: fontRegular });


    // Final Output
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}
