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

export async function sendLoanDecisionEmail(details: {
    email: string,
    name: string,
    status: 'approved' | 'rejected',
    amount: number,
    reason?: string
}) {
    if (!process.env.RESEND_API_KEY) return { success: false, error: "Missing RESEND_API_KEY" };

    try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { email, name, status, amount, reason } = details;

        const subject = status === 'approved'
            ? '🎉 Your Loan is Approved! - Omari Finance'
            : 'Update on your Loan Application - Omari Finance';

        const html = status === 'approved'
            ? `
                <h1>Good News, ${name}!</h1>
                <p>Your loan application for <strong>N$ ${amount}</strong> has been <strong>APPROVED</strong>.</p>
                <p>The funds will be disbursed to your account within 2 hours.</p>
                <p><strong>Repayment Due Date:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                <br/>
                <a href="https://omarifinance.com/dashboard">View Dashboard</a>
            `
            : `
                <h1>Application Update</h1>
                <p>Hi ${name},</p>
                <p>Thank you for applying for a loan with Omari Finance.</p>
                <p>After careful review, we regret to inform you that we cannot approve your application for N$ ${amount} at this time.</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                <p>You may re-apply in 30 days.</p>
            `;

        await resend.emails.send({
            from: 'Omari Finance <noreply@send.omarifinance.com>',
            to: email,
            subject,
            html
        });

        return { success: true };
    } catch (error) {
        console.error('Decision Email Error:', error);
        return { success: false, error };
    }
}
