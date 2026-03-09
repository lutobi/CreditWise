import * as fs from 'fs';
import { generateLoanAgreement } from '../src/lib/pdf-generator';

async function testGeneration() {
    console.log('Testing loan agreement generation via the backend generator...');
    const mockLoan = {
        amount: 1500,
        approved_at: new Date().toISOString()
    };
    const mockProfile = {
        first_name: 'John',
        last_name: 'Doe',
        id_number: '1234567890',
        phone_number: '+264 81 234 5678',
        email: 'johndoe@example.com'
    };

    try {
        const buffer = await generateLoanAgreement(mockLoan, mockProfile);
        fs.writeFileSync('./backend-contract-test.pdf', buffer);
        console.log('Successfully generated ./backend-contract-test.pdf');
    } catch (error) {
        console.error('Failed to generate PDF:', error);
    }
}

testGeneration();
