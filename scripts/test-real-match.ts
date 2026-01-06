
import { RekognitionClient, CompareFacesCommand } from "@aws-sdk/client-rekognition";
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyMatch() {
    console.log("--- Testing Real Face Match (AWS Rekognition) ---");

    const client = new RekognitionClient({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        }
    });

    // Valid public images of Barack Obama
    const sourceUrl = "https://upload.wikimedia.org/wikipedia/commons/8/8d/President_Barack_Obama.jpg";
    const targetUrl = "https://upload.wikimedia.org/wikipedia/commons/e/e9/Official_portrait_of_Barack_Obama.jpg";

    console.log("Downloading Source Image...");
    const sourceBytes = await fetch(sourceUrl).then(res => res.arrayBuffer());

    console.log("Downloading Target Image...");
    const targetBytes = await fetch(targetUrl).then(res => res.arrayBuffer());

    console.log("Sending to AWS Rekognition...");
    try {
        const command = new CompareFacesCommand({
            SourceImage: { Bytes: Buffer.from(sourceBytes) },
            TargetImage: { Bytes: Buffer.from(targetBytes) }, // Using same image for exact match test, or different?
            // Actually, let's use the two different images.
            SimilarityThreshold: 80,
        });

        const response = await client.send(command);
        const matches = response.FaceMatches || [];

        if (matches.length > 0) {
            console.log(`✅ MATCH FOUND!`);
            console.log(`   Similarity: ${matches[0].Similarity?.toFixed(2)}%`);
            console.log(`   Confidence: ${matches[0].Face?.Confidence?.toFixed(2)}%`);
        } else {
            console.log("❌ No Match Found (This is unexpected for these images).");
            if (response.UnmatchedFaces) console.log(`   Unmatched Faces: ${response.UnmatchedFaces.length}`);
        }

    } catch (error: any) {
        console.error("❌ Error:", error.message);
    }
}

verifyMatch();
