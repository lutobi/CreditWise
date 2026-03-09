import { renderToBuffer } from '@react-pdf/renderer';
import * as React from 'react';
import { LoanAgreementDocument } from '../components/pdf/loan-agreement';

/**
 * Generates a NAMFISA-compliant Loan Agreement PDF
 * using the Omari Finance React-PDF Letterhead Template.
 */
export async function generateLoanAgreement(loan: any, profileData: any): Promise<Buffer> {
    const profile = Array.isArray(profileData) ? profileData[0] : profileData;

    // Render the React component to a PDF buffer
    // renderToBuffer is an async operation that takes a React element
    // and returns a Node.js Buffer containing the PDF data.
    const pdfBuffer = await renderToBuffer(
        React.createElement(LoanAgreementDocument, { loan, profile }) as any
    );

    return pdfBuffer;
}
