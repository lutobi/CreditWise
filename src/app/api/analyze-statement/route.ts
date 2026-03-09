
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Polyfills for pdf-parse in Node.js environment (Next.js Build)
if (typeof Promise.withResolvers === 'undefined') {
    // @ts-ignore
    Promise.withResolvers = function () {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}

// Mock Canvas and DOMMatrix if missing
if (typeof global.DOMMatrix === 'undefined') {
    // @ts-ignore
    global.DOMMatrix = class DOMMatrix {
        constructor() { }
        toString() { return '[object DOMMatrix]'; }
    }
}
if (typeof global.Path2D === 'undefined') {
    // @ts-ignore
    global.Path2D = class Path2D { constructor() { } }
}
if (typeof global.ImageData === 'undefined') {
    // @ts-ignore
    global.ImageData = class ImageData { constructor() { } }
}

// pdf-parse loaded via require() inside handler for compatibility

export async function POST(req: NextRequest) {
    // AUTH CHECK — require logged-in user
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll(); } } }
    );
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let documentType = 'bank_statement';
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        if (formData.get('documentType')) {
            documentType = formData.get('documentType') as string;
        }

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let text = '';
        let metadataFraudFlags: string[] = [];

        // --- 0. Text Extraction & Metadata Analysis (PDF vs Image) ---
        if (file.type === 'application/pdf') {
            const pdf = require('pdf-parse');
            const data = await pdf(buffer);
            text = data.text;

            // Forensic PDF Metadata Check
            if (data.info) {
                const creator = data.info.Creator?.toLowerCase() || '';
                const producer = data.info.Producer?.toLowerCase() || '';
                const suspiciousTools = ['ilovepdf', 'sejda', 'photoshop', 'illustrator', 'coreldraw', 'pdf24'];

                suspiciousTools.forEach(tool => {
                    if (creator.includes(tool) || producer.includes(tool)) {
                        metadataFraudFlags.push(`Suspicious PDF Editor Detected: ${tool}`);
                    }
                });
            }
        } else if (file.type.startsWith('image/')) {
            const Tesseract = await import('tesseract.js');
            const result = await Tesseract.recognize(buffer, 'eng');
            text = result.data.text;
        } else {
            return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF, JPG, or PNG.' }, { status: 400 });
        }

        // --- 1. AI Analysis via Groq (Llama 3 70B) ---
        const { default: OpenAI } = await import('openai');

        const groq = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: "https://api.groq.com/openai/v1"
        });

        const bankStatementPrompt = `
            You are a highly skilled forensic financial auditor for Omari Finance.
            Your task is to thoroughly analyze this bank statement to extract the primary recurring monthly salary AND detect any signs of document tampering or fraud.
            
            Rules:
            1. Look for recurring deposits tagged as SALARY, WAGES, PAYROLL, or names of major employers. Ignore peer-to-peer transfers.
            2. PERFROM A MATHEMATICAL AUDIT: Verify that the transactions mathematically align with the daily running balances.
            3. LOOK FOR TAMPERING: Flag any anomalous formatting, backwards dates, or suspicious duplicate transaction IDs that indicate a PDF text editor was used.
            4. Return ONLY a valid JSON object matching this exact schema:
               {
                 "estimatedIncome": (number) The monthly salary amount (0 if none found),
                 "employerName": (string) The name of the employer ("None" if none found),
                 "confidenceScore": (number between 0 and 1) Your confidence in the income estimate,
                 "fraudProbability": (number between 0 and 1) Probability that this document has been altered or faked,
                 "fraudFlags": [(string)] Array of highly descriptive explanations of any suspicious findings. Explain exactly what the "core catch" is (e.g., "Mathematical Error: The deposit on Nov 15 does not correctly update the running balance", "Anomalous Formatting: The dates are out of chronological sequence"). Empty array if clean.
               }
            
            Do not include any conversational text. Return only the JSON.
        `;

        const payslipPrompt = `
            You are a highly skilled forensic financial auditor for Omari Finance.
            Your task is to thoroughly analyze this payslip to extract the net monthly pay AND detect any signs of document tampering or fraud.
            
            Rules:
            1. Find the final NET PAY, TAKE HOME PAY, or NET SALARY amount. Find the issuing Employer Name.
            2. PERFORM A MATHEMATICAL AUDIT: Verify that (Gross Pay - Tax - Deductions) exactly equals Net Pay.
            3. LOOK FOR TAMPERING: Flag generic template markers (e.g., "Your Company Name Here") or mathematically impossible figures.
            4. Return ONLY a valid JSON object matching this exact schema:
               {
                 "estimatedIncome": (number) The Net Pay amount (0 if none found),
                 "employerName": (string) The name of the employer ("None" if none found),
                 "confidenceScore": (number between 0 and 1) Your confidence in the income estimate,
                 "fraudProbability": (number between 0 and 1) Probability that this document has been altered or faked,
                 "fraudFlags": [(string)] Array of highly descriptive explanations of any suspicious findings. Explain exactly what the "core catch" is (e.g., "Mathematical Error: Gross Pay (5000) minus Deductions (1000) does not equal the stated Net Pay of 4500", "Template Marker Found: The document contains generic placeholder text suggesting a downloaded template"). Empty array if clean.
               }
            
            Do not include any conversational text. Return only the JSON.
        `;

        const systemPrompt = documentType === 'payslip' ? payslipPrompt : bankStatementPrompt;

        const completion = await groq.chat.completions.create({
            model: "llama3-70b-8192",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Analyze this ${documentType} text:\n\n${text.slice(0, 15000)}` } // Cap at 15k chars for token limits
            ],
            response_format: { type: "json_object" }
        });

        const aiResponse = JSON.parse(completion.choices[0].message.content || "{}");

        // Merge AI Fraud Flags with Metadata Fraud Flags
        const combinedFraudFlags = [...metadataFraudFlags, ...(aiResponse.fraudFlags || [])];
        const combinedFraudProbability = metadataFraudFlags.length > 0 ?
            Math.max(0.99, aiResponse.fraudProbability || 0) :
            (aiResponse.fraudProbability || 0);

        return NextResponse.json({
            success: true,
            documentType: documentType,
            estimatedIncome: aiResponse.estimatedIncome || 0,
            employerName: aiResponse.employerName || "Unknown",
            incomeConfidence: aiResponse.confidenceScore || 0,
            fraudProbability: combinedFraudProbability,
            fraudFlags: combinedFraudFlags,
            verificationSource: `groq-llama3-70b-${file.type.startsWith('image/') ? 'ocr' : 'pdf'}`
        });

    } catch (error: any) {
        console.error(`${documentType || 'Document'} Analysis Error:`, error);
        return NextResponse.json({ error: error.message || 'Failed to analyze document' }, { status: 500 });
    }
}
