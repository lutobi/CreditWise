'use server'

import { Resend } from 'resend';

export async function sendHRVerificationEmail(
    hrEmail: string,
    applicantEmail: string,
    applicantName: string,
    employerName: string
) {
    if (!process.env.RESEND_API_KEY) {
        console.error("RESEND_API_KEY is missing");
        return { success: false, error: "Missing RESEND_API_KEY" };
    }

    try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
            from: 'Omari Finance <noreply@omarifinance.com>',
            to: hrEmail,
            cc: [applicantEmail],
            subject: `Employment Verification Request for ${applicantName}`,
            html: `
                <h1>Employment Verification Request</h1>
                <p>Dear HR Department at <strong>${employerName}</strong>,</p>
                <p>We are processing a loan application from <strong>${applicantName}</strong> who has listed your organization as their employer.</p>
                <p>Could you please confirm the following by way of an employment confirmation letter or email:</p>
                <ul>
                    <li>Is ${applicantName} currently employed at ${employerName}?</li>
                    <li>What is their current position/title?</li>
                    <li>What is their employment start date?</li>
                    <li><strong>What is the current state of their employment? (e.g., Active, Probation, Notice Period)</strong></li>
                    <li><strong>Is their employment currently under any risk (e.g., retrenchment, disciplinary hearing)?</strong></li>
                </ul>
                <p>Please reply to this email with your confirmation. If you have any questions, feel free to contact us.</p>
                <br/>
                <p>Best regards,</p>
                <p><strong>Omari Finance Verification Team</strong></p>
                <hr/>
                <p style="font-size: 12px; color: #666;">This email was sent as part of a loan verification process. The applicant (${applicantEmail}) has been CC'd on this correspondence for transparency.</p>
            `
        });

        return { success: true };
    } catch (error) {
        console.error('HR Verification Email Error:', error);
        return { success: false, error };
    }
}
