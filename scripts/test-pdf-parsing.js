
const fs = require('fs');
const pdfModule = require('pdf-parse');
console.log('Keys:', Object.keys(pdfModule));
// Try different combinations
const pdf = pdfModule.default || pdfModule;

async function testParsing() {
    try {
        const buffer = fs.readFileSync('dummy_statement.pdf');

        // Basic usage of pdf-parse
        const data = await pdf(buffer);
        console.log('PDF Text:', data.text);

        const lines = data.text.split('\n');
        let calculatedIncome = 0;
        const incomeKeywords = ['SALARY', 'WAGES', 'PAYROLL', 'EARNINGS'];

        for (const line of lines) {
            const upperLine = line.toUpperCase();
            if (incomeKeywords.some(keyword => upperLine.includes(keyword))) {
                const matches = line.match(/\d{1,3}(,\d{3})*(\.\d{2})?/g);
                if (matches) {
                    for (const match of matches) {
                        const amount = parseFloat(match.replace(/,/g, ''));
                        console.log(`Found Amount: ${amount} in line: "${line.trim()}"`);
                        if (amount > 1000 && amount < 1000000) {
                            calculatedIncome += amount;
                        }
                    }
                }
            }
        }

        console.log('Total Estimated Income:', calculatedIncome);
        if (calculatedIncome === 15000) {
            console.log('✅ TEST PASSED');
        } else {
            console.log('❌ TEST FAILED (Expected 15000)');
        }

    } catch (e) {
        console.error("Test Failed", e);
    }
}

testParsing();
