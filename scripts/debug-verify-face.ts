
import { RekognitionClient, CompareFacesCommand } from "@aws-sdk/client-rekognition";
// Polyfill fetch for Node < 18 if needed, but ts-node usually has it or we use node-fetch. 
// Actually Node 18+ has fetch.
// We will assume modern Node.

import dotenv from 'dotenv';
dotenv.config();

const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";
const region = process.env.AWS_REGION || "us-east-1";

// Two public face images for testing
const ID_URL = "https://avatars.githubusercontent.com/u/1024025?v=4"; // Linus Torvalds
const SELFIE_URL = "https://avatars.githubusercontent.com/u/1024025?v=4"; // Linus Torvalds

const rekognition = new RekognitionClient({
    region,
    credentials: { accessKeyId, secretAccessKey }
});

async function testVerification() {
    console.log("🚀 Starting Verify Face Debug Script...");

    try {
        const fetchImage = async (url: string) => {
            console.log(`Fetching ${url}...`);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to fetch image: ${url} (Status: ${res.status})`);
            const arrayBuffer = await res.arrayBuffer();
            return Buffer.from(arrayBuffer);
        };

        const [sourceImage, targetImage] = await Promise.all([
            fetchImage(ID_URL),
            fetchImage(SELFIE_URL),
        ]);

        console.log("✅ Images fetched. Size 1:", sourceImage.length, "Size 2:", targetImage.length);

        const command = new CompareFacesCommand({
            SourceImage: { Bytes: sourceImage },
            TargetImage: { Bytes: targetImage },
            SimilarityThreshold: 80,
        });

        console.log("📡 Sending to AWS Rekognition...");
        const response = await rekognition.send(command);

        console.log("✅ AWS Response Received!");
        console.log("FaceMatches:", response.FaceMatches?.length);
        console.log("UnmatchedFaces:", response.UnmatchedFaces?.length);

        if (response.FaceMatches && response.FaceMatches.length > 0) {
            console.log("Match Similarity:", response.FaceMatches[0].Similarity);
        } else {
            console.log("❌ No matches found.");
        }

    } catch (error: any) {
        console.error("🔥 Error:", error);
        console.error("Stack:", error.stack);
    }
}

testVerification();
