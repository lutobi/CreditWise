
import { RekognitionClient, ListCollectionsCommand } from "@aws-sdk/client-rekognition";

import dotenv from 'dotenv';
dotenv.config();

const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";

async function checkRegion(region: string) {
    console.log(`Checking region: ${region}...`);
    const client = new RekognitionClient({
        region,
        credentials: { accessKeyId, secretAccessKey }
    });

    try {
        await client.send(new ListCollectionsCommand({}));
        console.log(`✅ Success! The correct region is: ${region}`);
        return true;
    } catch (error: any) {
        if (error.name === 'UnrecognizedClientException' || error.name === 'InvalidSignatureException') {
            console.log(`❌ Auth failed in ${region} (Keys might be inactive or wrong region signature)`);
        } else {
            // If we get AccessDenied, the region is likely correct but permissions are tight. 
            // If we get a connection error, region might be wrong.
            // Rekognition is specific: some regions don't support it.
            console.log(`⚠️  Error in ${region}: ${error.name} - ${error.message}`);
            // If it's a valid AWS region but service not active, we often get a different error.
            if (error.name === 'AccessDeniedException') {
                console.log(`✅ Region ${region} seems valid (AccessDenied implies endpoint was reached).`);
                return true;
            }
        }
        return false;
    }
}

async function main() {
    // Check the user suggested regions
    const regions = ["us-east-1", "eu-north-1", "eu-west-1", "af-south-1"];

    for (const region of regions) {
        if (await checkRegion(region)) {
            break;
        }
    }
}

main();
