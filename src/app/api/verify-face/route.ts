import { RekognitionClient, CompareFacesCommand } from "@aws-sdk/client-rekognition";
import { NextResponse } from "next/server";

const rekognition = new RekognitionClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

export async function POST(req: Request) {
    try {
        const { idUrl, selfieUrl } = await req.json();

        if (!idUrl || !selfieUrl) {
            return NextResponse.json(
                { error: "Both ID and Selfie URLs are required" },
                { status: 400 }
            );
        }

        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            console.error("AWS Credentials missing");
            // For dev/demo purpose if keys missing, we might want to mock or fail.
            // Fail is safer.
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        // Helper to fetch image bytes
        const fetchImage = async (url: string, label: string) => {
            console.log(`[${label}] Fetching: ${url.substring(0, 50)}...`);
            try {
                const res = await fetch(url);
                if (!res.ok) {
                    console.error(`[${label}] Fetch Failed! Status: ${res.status} ${res.statusText}`);
                    throw new Error(`Failed to fetch ${label}: ${res.status} ${res.statusText}`);
                }
                const buf = await res.arrayBuffer();
                console.log(`[${label}] Fetched ${buf.byteLength} bytes.`);
                return Buffer.from(buf);
            } catch (e: any) {
                console.error(`[${label}] Network Error:`, e.message);
                throw e;
            }
        };

        console.log("Fetching images for verification...");
        const [sourceImage, targetImage] = await Promise.all([
            fetchImage(idUrl, "ID_DOC"),       // Source = ID Card
            fetchImage(selfieUrl, "SELFIE"),   // Target = Selfie
        ]);

        const command = new CompareFacesCommand({
            SourceImage: { Bytes: sourceImage },
            TargetImage: { Bytes: targetImage },
            SimilarityThreshold: 80, // strictness
        });

        console.log("Sending to AWS Rekognition...");
        const response = await rekognition.send(command);

        const faceMatches = response.FaceMatches || [];
        const isMatch = faceMatches.length > 0 && (faceMatches[0].Similarity || 0) >= 85;

        return NextResponse.json({
            success: true,
            isMatch,
            similarity: faceMatches.length > 0 ? faceMatches[0].Similarity : 0,
            details: faceMatches
        });

    } catch (error: any) {
        console.error("🔥 FATAL VERIFICATION ERROR:", error);
        if (error instanceof Error) {
            console.error("Stack:", error.stack);
            console.error("Message:", error.message);
        }
        return NextResponse.json(
            { error: "Verification failed", details: error.message, debug: "Check server logs for '🔥'" },
            { status: 500 }
        );
    }
}
