import React from 'react';
import { renderToFile } from '@react-pdf/renderer';
import { OmariLetterhead } from '../src/components/pdf/omari-letterhead';

async function generatePDF() {
    const outputPath = './omari-letterhead-output.pdf';
    console.log(`Rendering PDF to ${outputPath}...`);
    try {
        await renderToFile(<OmariLetterhead />, outputPath);
        console.log('Successfully generated PDF!');
    } catch (error) {
        console.error('Error generating PDF:', error);
    }
}

generatePDF();
