
import fs from 'fs';
import path from 'path';
import { generateLoanAgreement } from '../src/lib/pdf-generator';

async function testPdfGeneration() {
    console.log("Starting PDF generation test...");

    const mockLoan = {
        id: "LOAN-123456789",
        amount: 5000,
        approved_at: new Date().toISOString(),
        application_data: {
            address: "123 Test Street, Windhoek, Namibia"
        }
    };

    const mockProfile = {
        full_name: "John Doe Test",
        national_id: "90010100123",
        address: "456 Profile Lane, Windhoek, Namibia"
    };

    try {
        const pdfBuffer = await generateLoanAgreement(mockLoan, mockProfile);
        const outputPath = path.join(process.cwd(), 'test-layout-output.pdf');
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log(`✅ PDF generated successfully at: ${outputPath}`);
    } catch (error) {
        console.error("❌ PDF generation failed:", error);
        process.exit(1);
    }
}

testPdfGeneration();
