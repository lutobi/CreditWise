
import { RekognitionClient, CompareFacesCommand } from "@aws-sdk/client-rekognition";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/safe-logger';
import { requireAdmin } from '@/lib/require-admin';
import { faceVerificationSchema } from '@/lib/validation';

const rekognition = new RekognitionClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

export async function POST(req: NextRequest) {
    try {
        // 0. Admin Auth Check (replaces CSRF — admin UI doesn't send CSRF tokens)
        const auth = await requireAdmin(req);
        if (auth instanceof NextResponse) return auth;

        // Rate Limiting (protects AWS costs)
        const ip = getClientIp(req.headers);
        const rateLimit = checkRateLimit(`verify-face:${ip}`, RATE_LIMITS.VERIFICATION);
        if (!rateLimit.success) {
            return NextResponse.json(
                { error: "Too many verification attempts. Please try again later." },
                { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)) } }
            );
        }

        // 1. Zod Validation
        const rawBody = await req.json();
        const validation = faceVerificationSchema.safeParse(rawBody);

        if (!validation.success) {
            logger.warn('Face verification validation failed', { issues: validation.error.issues });
            return NextResponse.json({
                error: "Invalid request data",
                details: validation.error.issues
            }, { status: 400 });
        }

        const { idUrl, selfieUrl, userId } = validation.data;

        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            logger.error("AWS Credentials missing");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }


        // Helper to fetch image bytes
        const fetchImage = async (url: string, label: string) => {
            logger.debug(`Fetching image`, { label, url });
            try {
                const res = await fetch(url);
                if (!res.ok) {
                    logger.error(`Fetch Failed`, { label, status: res.status, statusText: res.statusText });
                    throw new Error(`Failed to fetch ${label}: ${res.status} ${res.statusText}`);
                }
                const buf = await res.arrayBuffer();
                logger.debug(`Fetched image bytes`, { label, byteLength: buf.byteLength });
                return Buffer.from(buf);
            } catch (e: any) {
                logger.error(`Network Error`, { label, error: e.message });
                throw e;
            }
        };

        logger.info("Starting face verification", { userId });
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
            logger.debug("Sending to AWS Rekognition");
            const response = await rekognition.send(command);

            const faceMatches = response.FaceMatches || [];
            similarity = faceMatches.length > 0 ? faceMatches[0].Similarity || 0 : 0;
            isMatch = similarity >= 85;
            details = faceMatches;
        } catch (awsError: any) {
            logger.error("AWS Rekognition Error", { error: awsError.message, name: awsError.name });
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

            if (error) logger.error("Failed to save confidence score", { error, userId });
            else logger.info("Saved verification result", { confidence: finalConfidence, userId });
        }

        if (verificationFailed) {
            return NextResponse.json({
                success: false,
                error: failureReason,
                isMatch: false,
                similarity: 0
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            isMatch,
            similarity,
            details
        });

    } catch (error: any) {
        logger.error("FATAL VERIFICATION ERROR", { error: error.message });
        return NextResponse.json(
            { error: "Verification failed" },
            { status: 500 }
        );
    }
}
