
import { RekognitionClient, CompareFacesCommand } from "@aws-sdk/client-rekognition";
import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js'

const rekognition = new RekognitionClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

export async function POST(req: Request) {
    try {
        // 1. Parse Body Once
        const { idUrl, selfieUrl, userId } = await req.json();

        if (!idUrl || !selfieUrl) {
            return NextResponse.json(
                { error: "Both ID and Selfie URLs are required" },
                { status: 400 }
            );
        }

        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            console.error("AWS Credentials missing");
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

        let isMatch = false;
        let similarity = 0;
        let details: any[] = [];
        let verificationFailed = false;
        let failureReason = "";

        try {
            console.log("Sending to AWS Rekognition...");
            const response = await rekognition.send(command);

            const faceMatches = response.FaceMatches || [];
            similarity = faceMatches.length > 0 ? faceMatches[0].Similarity || 0 : 0;
            isMatch = similarity >= 85;
            details = faceMatches;
        } catch (awsError: any) {
            console.error("AWS Rekognition Error:", awsError.name, awsError.message);
            verificationFailed = true;
            failureReason = awsError.message || "AWS Check Failed";

            // Treat specific AWS errors as "No Match" / "Failed" 
            if (awsError.name === 'InvalidImageFormatException') {
                failureReason = "Invalid Image Format (WebP/HEIC not supported).";
            }
        }

        // 2. Persist to Supabase if userId is provided (Even on failure)
        if (userId) {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            // If verification failed (error), we set confidence to 0 and verified to false
            const finalConfidence = verificationFailed ? 0 : similarity;
            const finalVerified = verificationFailed ? false : isMatch;

            const { error } = await supabase
                .from('verifications')
                .update({
                    confidence: finalConfidence,
                    face_verified: finalVerified,
                    updated_at: new Date().toISOString(),
                    // valid_id_failed_reason: failureReason // Optional: if you add this column later
                })
                .eq('user_id', userId);

            if (error) console.error("Failed to save confidence score:", error);
            else console.log(`Saved confidence ${finalConfidence} to user ${userId}`);
        }

        if (verificationFailed) {
            return NextResponse.json({
                success: false,
                error: failureReason,
                isMatch: false,
                similarity: 0
            }, { status: 400 }); // Return 400 so frontend knows it failed but result is saved
        }

        return NextResponse.json({
            success: true,
            isMatch,
            similarity,
            details
        });

    } catch (error: any) {
        console.error("🔥 FATAL VERIFICATION ERROR:", error);
        return NextResponse.json(
            { error: "Verification failed", details: error.message },
            { status: 500 }
        );
    }
}
