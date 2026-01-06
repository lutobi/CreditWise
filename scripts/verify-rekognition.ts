
import { RekognitionClient, ListCollectionsCommand } from "@aws-sdk/client-rekognition";
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyRekognition() {
    console.log("--- Verifying AWS Rekognition Configuration ---");

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || "us-east-1";

    if (!accessKeyId || !secretAccessKey) {
        console.error("❌ AWS Keys are MISSING in .env.local");
        console.error("   Please add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY");
        return;
    }

    console.log(`✅ Keys found (Region: ${region})`);
    console.log("   Attempting to connect to AWS Rekognition...");

    const client = new RekognitionClient({
        region,
        credentials: { accessKeyId, secretAccessKey }
    });

    try {
        const command = new ListCollectionsCommand({});
        const response = await client.send(command);
        console.log("✅ Connection Successful!");
        console.log(`   Collections found: ${response.CollectionIds?.length || 0}`);
        console.log("   (This confirms the credentials are valid and have Rekognition access)");
    } catch (error: any) {
        console.error("❌ AWS Connection Failed:");
        console.error("   Code:", error.name);
        console.error("   Message:", error.message);
    }
}

verifyRekognition();
