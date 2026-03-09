import * as fs from "fs";
import { Document, Packer, Paragraph, TextRun, Header, Footer, ImageRun, AlignmentType, BorderStyle, ShadingType, convertInchesToTwip, HorizontalPositionAlign, VerticalPositionAlign, TextWrappingType, TextWrappingSide, FrameAnchorType } from "docx";

// --- Color Constants ---
const BRAND_PRIMARY = "7c3aed";
const TEXT_SLATE = "334155";
const TEXT_MUTED = "94a3b8";

async function generateWordLetterhead() {
    console.log("Starting Word Letterhead layout...");

    // Read local images
    const fabricPatternBuffer = fs.readFileSync("./public/namibian-pattern.png");

    // Create the Word Document
    const doc = new Document({
        creator: "Omari Finance",
        title: "Omari Finance Letterhead",
        description: "Official Letterhead",
        styles: {
            default: {
                document: {
                    run: {
                        font: "Helvetica",
                        size: 20, // 10pt
                        color: TEXT_SLATE,
                    },
                },
            },
        },
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: convertInchesToTwip(1.8), // Leave room for 120px header
                        bottom: convertInchesToTwip(1.2),
                        left: convertInchesToTwip(1.2),
                        right: convertInchesToTwip(1.2),
                    },
                },
            },
            headers: {
                default: new Header({
                    children: [
                        // Paragraph wrapping the background pattern
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: fabricPatternBuffer,
                                    transformation: {
                                        width: 800,
                                        height: 120,
                                    },
                                    floating: {
                                        horizontalPosition: {
                                            align: HorizontalPositionAlign.LEFT,
                                        },
                                        verticalPosition: {
                                            align: VerticalPositionAlign.TOP,
                                        },
                                        wrap: {
                                            type: TextWrappingType.BEHIND,
                                        },
                                    },
                                }),
                            ],
                        }),
                        // Empty line for spacing over the absolute image
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),

                        // The Header Text Overlay Block
                        new Paragraph({
                            spacing: { after: 200 },
                            border: {
                                bottom: {
                                    color: BRAND_PRIMARY,
                                    space: 10,
                                    style: BorderStyle.SINGLE,
                                    size: 24, // 3pt thickness
                                },
                            },
                        }),
                    ],
                }),
            },
            footers: {
                default: new Footer({
                    children: [
                        new Paragraph({
                            border: {
                                top: {
                                    color: "e2e8f0",
                                    space: 15,
                                    style: BorderStyle.SINGLE,
                                    size: 6,
                                },
                            },
                            spacing: { before: 200 },
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "WINDHOEK - SWAKOPMUND - WALVIS BAY",
                                    color: TEXT_MUTED,
                                    size: 16,
                                    allCaps: true,
                                }),
                                new TextRun({
                                    text: "\t\t\t\t\t\www.omarifinance.com", // Hitting tabs to push right
                                    color: BRAND_PRIMARY,
                                    bold: true,
                                    size: 16,
                                }),
                            ],
                        }),
                    ],
                }),
            },
            children: [
                new Paragraph({
                    children: [
                        new TextRun({ text: "Dear Client," }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: " " }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Please enter your letter content here." }),
                    ],
                }),
            ],
        }],
    });

    const b64string = await Packer.toBuffer(doc);
    fs.writeFileSync("./omari-letterhead-output.docx", b64string);
    console.log("Successfully generated ./omari-letterhead-output.docx");
}

generateWordLetterhead().catch(console.error);
