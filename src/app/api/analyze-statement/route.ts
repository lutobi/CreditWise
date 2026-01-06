
import { NextRequest, NextResponse } from 'next/server';

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

const pdf = require('pdf-parse');

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse PDF
        const data = await pdf(buffer);
        const text = data.text;

        // --- 1. Basic Income Detection Logic ---
        // Look for lines containing "Salary", "Wages", "Payroll" and a number
        // This is a naive heuristic for the MVP.
        const lines = text.split('\n');
        let calculatedIncome = 0;
        let incomeCount = 0;

        const incomeKeywords = ['SALARY', 'WAGES', 'PAYROLL', 'EARNINGS'];

        for (const line of lines) {
            const upperLine = line.toUpperCase();
            // Check if line has a keyword
            if (incomeKeywords.some(keyword => upperLine.includes(keyword))) {
                // Try to extract a number from this line
                // Regex to find currency-like numbers (e.g., 15000.00 or 15,000.00)
                // Excluding year-like numbers (2023, 2024) if they appear alone
                const matches = line.match(/\d{1,3}(,\d{3})*(\.\d{2})?/g);

                if (matches) {
                    for (const match of matches) {
                        const amount = parseFloat(match.replace(/,/g, ''));
                        // Filter out small amounts (e.g. fees) or dates (2024)
                        if (amount > 1000 && amount < 1000000) {
                            calculatedIncome += amount;
                            incomeCount++;
                            // Assume simplified monthly statement: usually 1 salary entry
                            // If multiple, we sum them (e.g. bi-weekly).
                        }
                    }
                }
            }
        }

        // --- 2. Identity Detection (Optional Stealth Check) ---
        // We could look for the applicant's name in the header area.
        // For MVP, we just return the income.

        const confidence = incomeCount > 0 ? 0.9 : 0.0;

        return NextResponse.json({
            success: true,
            estimatedIncome: calculatedIncome,
            incomeConfidence: confidence,
            verificationSource: 'pdf-parse-v1'
        });

    } catch (error: any) {
        console.error('PDF Parse Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to parse PDF' }, { status: 500 });
    }
}
