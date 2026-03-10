"use client"

import React, { useRef, useState, useCallback } from "react"
import Webcam from "react-webcam"
import { Button } from "@/components/ui/button"
import { Camera, RefreshCw } from "lucide-react"

interface LiveSelfieProps {
    onCapture: (file: File | null) => void
    error?: string
}

export function LiveSelfie({ onCapture, error }: LiveSelfieProps) {
    const webcamRef = useRef<Webcam>(null)
    const [isReviewing, setIsReviewing] = useState(false)
    const [imgSrc, setImgSrc] = useState<string | null>(null)

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot()
        if (imageSrc) {
            setImgSrc(imageSrc)
            setIsReviewing(true)
        }
    }, [webcamRef])

    const confirmPhoto = () => {
        if (imgSrc) {
            try {
                // Determine mime type and base64 data
                const arr = imgSrc.split(',');
                const mimeMatch = arr[0].match(/:(.*?);/);
                const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                const file = new File([u8arr], "live-selfie.jpg", { type: mime });
                onCapture(file);
            } catch (err) {
                console.error("Failed to convert image data", err);
                if (error) {
                    // Try to notify the parent or log
                }
            }
        }
    }

    const retake = () => {
        setImgSrc(null)
        setIsReviewing(false)
        onCapture(null)
    }

    const videoConstraints = {
        facingMode: "user",
        width: 720,
        height: 720
    }

    return (
        <div className="space-y-4">
            <div className="relative aspect-square max-w-sm mx-auto overflow-hidden rounded-full border-4 border-dashed border-primary/50 bg-gray-900 shadow-xl">
                {imgSrc ? (
                    <img src={imgSrc} alt="Captured selfie" className="w-full h-full object-cover transform scale-x-[-1]" />
                ) : (
                    <>
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={videoConstraints}
                            className="w-full h-full object-cover transform scale-x-[-1]"
                            mirrored={true}
                        />
                        {/* Guidance Overlay */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <svg viewBox="0 0 100 100" className="w-full h-full opacity-60">
                                <ellipse cx="50" cy="50" rx="30" ry="40" fill="none" stroke="white" strokeWidth="2" strokeDasharray="5,5" />
                            </svg>
                            <p className="absolute top-10 text-white/80 text-xs font-semibold uppercase tracking-wider bg-black/40 px-2 py-1 rounded">
                                Position Face Here
                            </p>
                        </div>
                    </>
                )}
            </div>

            <div className="flex justify-center gap-4">
                {isReviewing ? (
                    <>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={retake}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Retake
                        </Button>
                        <Button
                            type="button"
                            variant="default"
                            onClick={confirmPhoto}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                        >
                            <Camera className="w-4 h-4" />
                            Confirm & Use
                        </Button>
                    </>
                ) : (
                    <Button
                        type="button"
                        onClick={capture}
                        size="lg"
                        className="flex items-center gap-2 min-w-[200px]"
                    >
                        <Camera className="w-5 h-5" />
                        Capture Photo
                    </Button>
                )}
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <p className="text-xs text-gray-500 text-center">
                {isReviewing
                    ? "Check your photo. Ensure your face is clearly visible."
                    : "Look directly at the camera. Ensure you are in a well-lit area."}
            </p>
        </div>
    )
}
