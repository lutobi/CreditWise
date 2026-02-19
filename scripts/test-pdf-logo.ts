import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function testLogo() {
    console.log("Starting PDF Logo Test...");
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    
    // Read the logo string from the file
    const generatorContent = fs.readFileSync(path.join(process.cwd(), 'src/lib/pdf-generator.ts'), 'utf-8');
    const match = generatorContent.match(/const LOGO_BASE64 = '([^']+)';/);
    
    if (!match) {
        console.error("Could not find LOGO_BASE64 in src/lib/pdf-generator.ts");
        return;
    }
    
    const LOGO_BASE64 = match[1];
    console.log("Found LOGO_BASE64 (Length: " + LOGO_BASE64.length + ")");
    console.log("Starts with: " + LOGO_BASE64.substring(0, 10));

    const logoBytes = Buffer.from(LOGO_BASE64, 'base64');
    
    try {
        console.log("Attempting embedJpg...");
        const logoImage = await pdfDoc.embedJpg(logoBytes);
        console.log("SUCCESS: embedJpg worked. Dimensions: " + logoImage.width + "x" + logoImage.height);
        
        page.drawImage(logoImage, {
            x: 50,
            y: 700,
            width: 180,
            height: (logoImage.height / logoImage.width) * 180,
        });
        
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync('test-logo-output.pdf', pdfBytes);
        console.log("PDF saved to test-logo-output.pdf");
    } catch (e: any) {
        console.error("embedJpg FAILED: " + e.message);
        
        try {
            console.log("Attempting embedPng fallback...");
            const logoImage = await pdfDoc.embedPng(logoBytes);
            console.log("SUCCESS: embedPng worked.");
        } catch (e2: any) {
            console.error("embedPng FAILED: " + e2.message);
        }
    }
}

testLogo().catch(console.error);
