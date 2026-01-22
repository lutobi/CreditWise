
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function testPdf() {
    console.log("Generating Test PDF...");
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    page.drawText('TEST CONTRACT - OMARI FINANCE', {
        x: 50,
        y: height - 50,
        size: 30,
    });

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('test-contract.pdf', pdfBytes);
    console.log("✅ PDF Generated: test-contract.pdf");
}

testPdf().catch(console.error);
