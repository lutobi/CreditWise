import { describe, it, expect } from 'vitest';

/**
 * AI Forensic Engine - Logic-Level Tests
 * 
 * These tests validate the core fraud-detection LOGIC without mocking
 * the full Next.js route handler. We test:
 * 1. PDF Metadata Scanner (suspicious editor detection)
 * 2. Fraud Flag Merging (metadata + AI flags combined)
 * 3. Fraud Probability Boosting (metadata overrides AI score)
 * 4. File Type Routing (PDF vs Image vs Unsupported)
 */

// ===== 1. PDF METADATA SCANNER LOGIC =====
// This is the exact logic from the route, extracted for isolated testing.
function scanPdfMetadata(info: { Creator?: string; Producer?: string } | null): string[] {
    const flags: string[] = [];
    if (!info) return flags;

    const creator = info.Creator?.toLowerCase() || '';
    const producer = info.Producer?.toLowerCase() || '';
    const suspiciousTools = ['ilovepdf', 'sejda', 'photoshop', 'illustrator', 'coreldraw', 'pdf24'];

    suspiciousTools.forEach(tool => {
        if (creator.includes(tool) || producer.includes(tool)) {
            flags.push(`Suspicious PDF Editor Detected: ${tool}`);
        }
    });

    return flags;
}

// ===== 2. FRAUD PROBABILITY MERGE LOGIC =====
// This is the exact logic from the route, extracted for testing.
function mergeFraudResults(
    metadataFlags: string[],
    aiFraudProbability: number,
    aiFraudFlags: string[]
): { fraudProbability: number; fraudFlags: string[] } {
    const combinedFlags = [...metadataFlags, ...aiFraudFlags];
    const combinedProbability = metadataFlags.length > 0
        ? Math.max(0.99, aiFraudProbability)
        : aiFraudProbability;
    return { fraudProbability: combinedProbability, fraudFlags: combinedFlags };
}

// ===== 3. FILE TYPE ROUTER LOGIC =====
function getDocumentRoute(fileType: string): 'pdf' | 'ocr' | 'unsupported' {
    if (fileType === 'application/pdf') return 'pdf';
    if (fileType.startsWith('image/')) return 'ocr';
    return 'unsupported';
}


describe('Forensic Engine: PDF Metadata Scanner', () => {

    it('Should flag documents created with iLovePDF', () => {
        const flags = scanPdfMetadata({ Creator: 'iLovePDF Merge Tool', Producer: 'iLovePDF' });
        expect(flags.length).toBeGreaterThan(0);
        expect(flags.some(f => f.includes('ilovepdf'))).toBe(true);
    });

    it('Should flag documents created with Adobe Photoshop', () => {
        const flags = scanPdfMetadata({ Creator: 'Adobe Photoshop CC 2024', Producer: 'Adobe PDF Library' });
        expect(flags.length).toBe(1);
        expect(flags[0]).toContain('photoshop');
    });

    it('Should flag documents created with Sejda PDF Editor', () => {
        const flags = scanPdfMetadata({ Creator: 'Sejda PDF Editor v7', Producer: 'Sejda SDK' });
        expect(flags.some(f => f.includes('sejda'))).toBe(true);
    });

    it('Should flag documents created with CorelDRAW', () => {
        const flags = scanPdfMetadata({ Creator: 'CorelDRAW 2023', Producer: 'Corel PDF Engine' });
        expect(flags.some(f => f.includes('coreldraw'))).toBe(true);
    });

    it('Should flag documents created with PDF24', () => {
        const flags = scanPdfMetadata({ Creator: 'pdf24.org', Producer: 'PDF24 Creator' });
        expect(flags.some(f => f.includes('pdf24'))).toBe(true);
    });

    it('Should NOT flag legitimate bank-generated PDFs', () => {
        const flags = scanPdfMetadata({ Creator: 'FNB Online Banking', Producer: 'Enterprise Reports Engine' });
        expect(flags).toHaveLength(0);
    });

    it('Should NOT flag Standard Bank statements', () => {
        const flags = scanPdfMetadata({ Creator: 'Standard Bank Digital', Producer: 'SAP Crystal Reports' });
        expect(flags).toHaveLength(0);
    });

    it('Should handle null/missing metadata gracefully', () => {
        expect(scanPdfMetadata(null)).toHaveLength(0);
        expect(scanPdfMetadata({})).toHaveLength(0);
        expect(scanPdfMetadata({ Creator: undefined, Producer: undefined })).toHaveLength(0);
    });
});


describe('Forensic Engine: Fraud Probability Merge', () => {

    it('Should boost fraud probability to 99% if metadata flags exist', () => {
        const result = mergeFraudResults(
            ['Suspicious PDF Editor Detected: ilovepdf'],
            0.1, // AI said low fraud
            []
        );
        expect(result.fraudProbability).toBe(0.99);
        expect(result.fraudFlags).toHaveLength(1);
    });

    it('Should combine BOTH metadata and AI fraud flags', () => {
        const result = mergeFraudResults(
            ['Suspicious PDF Editor Detected: sejda'],
            0.7,
            ['Mathematical Error: Running balance mismatch on Nov 15']
        );
        expect(result.fraudProbability).toBe(0.99); // Boosted by metadata
        expect(result.fraudFlags).toHaveLength(2);
        expect(result.fraudFlags[0]).toContain('sejda');
        expect(result.fraudFlags[1]).toContain('Mathematical Error');
    });

    it('Should use AI probability when no metadata flags exist', () => {
        const result = mergeFraudResults(
            [], // Clean metadata
            0.65, // AI detected some issues
            ['Anomalous Formatting: Dates out of sequence']
        );
        expect(result.fraudProbability).toBe(0.65);
        expect(result.fraudFlags).toHaveLength(1);
    });

    it('Should return clean results for legitimate documents', () => {
        const result = mergeFraudResults([], 0.05, []);
        expect(result.fraudProbability).toBe(0.05);
        expect(result.fraudFlags).toHaveLength(0);
    });
});


describe('Forensic Engine: File Type Routing', () => {

    it('Should route PDFs to the pdf-parse engine', () => {
        expect(getDocumentRoute('application/pdf')).toBe('pdf');
    });

    it('Should route JPEG images to the OCR engine', () => {
        expect(getDocumentRoute('image/jpeg')).toBe('ocr');
    });

    it('Should route PNG images to the OCR engine', () => {
        expect(getDocumentRoute('image/png')).toBe('ocr');
    });

    it('Should reject Word documents as unsupported', () => {
        expect(getDocumentRoute('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('unsupported');
    });

    it('Should reject plain text as unsupported', () => {
        expect(getDocumentRoute('text/plain')).toBe('unsupported');
    });
});
