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
    const [imgSrc, setImgSrc] = useState<string | null>(null)

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot()
        if (imageSrc) {
            setImgSrc(imageSrc)

            // Convert base64 to File object
            fetch(imageSrc)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], "live-selfie.jpg", { type: "image/jpeg" })
                    onCapture(file)
                })
        }
    }, [webcamRef, onCapture])

    const retake = () => {
        setImgSrc(null)
        onCapture(null)
    }

    const videoConstraints = {
        facingMode: "user",
        width: 720,
        height: 720
    }

    return (
        <div className="space-y-4">
            <div className="relative aspect-square max-w-sm mx-auto overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                {imgSrc ? (
                    <img src={imgSrc} alt="Captured selfie" className="w-full h-full object-cover" />
                ) : (
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={videoConstraints}
                        className="w-full h-full object-cover"
                    />
                )}
            </div>

            <div className="flex justify-center">
                {imgSrc ? (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={retake}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retake Photo
                    </Button>
                ) : (
                    <Button
                        type="button"
                        onClick={capture}
                        className="flex items-center gap-2"
                    >
                        <Camera className="w-4 h-4" />
                        Capture Live Selfie
                    </Button>
                )}
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <p className="text-xs text-gray-500 text-center">
                {imgSrc ? "Photo captured. Click Retake to try again." : "Look clearly at the camera and click Capture."}
            </p>
        </div>
    )
}
