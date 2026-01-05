'use server'

import { Resend } from 'resend';

export async function sendAdminLoanAlert(loanDetails: any) {
    if (!process.env.RESEND_API_KEY) {
        console.error("RESEND_API_KEY is missing");
        return { success: false, error: "Missing RESEND_API_KEY" };
    }

    try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { amount, duration, applicantName, applicantEmail } = loanDetails;

        // 1. Send Alert to Admin
        await resend.emails.send({
            from: 'Omari Finance <noreply@send.omarifinance.com>',
            to: 'abimbolatobi@gmail.com', // Hardcoded Admin Email for now
            subject: `🚀 New Loan Application: N$${amount}`,
            html: `
        <h1>New Loan Application Received</h1>
        <p><strong>Applicant:</strong> ${applicantName} (${applicantEmail})</p>
        <p><strong>Amount:</strong> N$ ${amount}</p>
        <p><strong>Duration:</strong> ${duration} Months</p>
        <hr />
        <p>Login to Admin Portal to approve/reject.</p>
        <a href="https://omarifinance.com/admin">Go to Admin Portal</a>
      `
        });

        // 2. Send Confirmation to User
        await resend.emails.send({
            from: 'Omari Finance <noreply@send.omarifinance.com>',
            to: applicantEmail,
            subject: 'Loan Application Received - Omari Finance',
            html: `
          <h1>Application Received!</h1>
          <p>Hi ${applicantName},</p>
          <p>We have received your application for <strong>N$ ${amount}</strong>.</p>
          <p>Our team is reviewing your details and will notify you shortly.</p>
          <br/>
          <p>Best regards,</p>
          <p>The Omari Finance Team</p>
        `
        });

        return { success: true };
    } catch (error) {
        console.error('Email Alert Error:', error);
        // Don't throw, just return failure so client flow continues
        return { success: false, error };
    }
}
