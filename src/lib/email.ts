
import { Resend } from 'resend';

// Initialize Resend with API Key (safely)
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Sender Identity (Must be verified in Resend Dashboard, usually 'onboarding@resend.dev' for testing or your domain pending verification)
const FROM_EMAIL = 'Omari Finance <noreply@omarifinance.com>';

interface EmailUser {
    email: string;
    full_name: string;
}

interface EmailLoan {
    id: string;
    amount: number;
}

export async function sendApprovalEmail(user: EmailUser, loan: EmailLoan, pdfBuffer: Buffer) {
    if (!resend) {
        console.warn("⚠️ SKIPPING EMAIL: RESEND_API_KEY is not set.");
        return { success: false, error: 'No API Key' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [user.email],
            bcc: ['lucy@omarifinance.com'], // Admin Copy
            subject: '🎉 Your Loan is Approved! - Omari Finance',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #16a34a;">Congratulations, ${user.full_name}!</h1>
                    <p>Your loan application (Ref: ${loan.id.slice(0, 8)}) for <strong>N$ ${loan.amount.toLocaleString()}</strong> has been approved.</p>
                    <p>The funds will be disbursed to your registered bank account shortly (usually within 24 hours).</p>
                    
                    <hr style="border: 1px solid #eee; margin: 20px 0;" />
                    
                    <h3>📝 Your Loan Agreement</h3>
                    <p>Attached to this email is your copy of the Loan Agreement. This document confirms the terms you digitally accepted during your application.</p>
                    <p>Please save this for your records.</p>
                    
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        Omari Finance (Pty) Ltd.<br/>
                        Windhoek, Namibia
                    </p>
                </div>
            `,
            attachments: [
                {
                    filename: `Omari_Loan_Agreement_${loan.id.slice(0, 8)}.pdf`,
                    content: pdfBuffer,
                },
            ],
        });

        if (error) {
            console.error("Resend Error:", error);
            return { success: false, error };
        }

        console.log(`📧 Approval Email sent to ${user.email}`);
        return { success: true, data };

    } catch (e: any) {
        console.error("Email Exception:", e);
        return { success: false, error: e.message };
    }
}

export async function sendRejectionEmail(user: EmailUser, reason: string) {
    if (!resend) {
        console.warn("⚠️ SKIPPING EMAIL: RESEND_API_KEY is not set.");
        return { success: false, error: 'No API Key' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [user.email],
            subject: 'Update on your Loan Application - Omari Finance',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333;">Application Update</h1>
                    <p>Dear ${user.full_name},</p>
                    <p>Thank you for considering Omari Finance. After carefully reviewing your application, we regret to inform you that we are unable to approve your loan at this time.</p>
                    
                    <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #999; margin: 20px 0;">
                        <strong>Reason:</strong> ${reason}
                    </div>

                    <p>You may re-apply in 30 days if your financial circumstances change.</p>
                    
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        Omari Finance (Pty) Ltd.
                    </p>
                </div>
            `
        });

        if (error) {
            console.error("Resend Error:", error);
            return { success: false, error };
        }

        console.log(`📧 Rejection Email sent to ${user.email}`);
        return { success: true, data };

    } catch (e: any) {
        console.error("Email Exception:", e);
        return { success: false, error: e.message };
    }
}
