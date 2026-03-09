"use client";

import dynamic from "next/dynamic";
import { LottieComponentProps } from "lottie-react";

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface LottieAnimationProps extends Omit<LottieComponentProps, "animationData"> {
    animationData: any;
    className?: string;
}

export function LottieAnimation({ animationData, className, ...props }: LottieAnimationProps) {
    return (
        <div className={className}>
            <Lottie animationData={animationData} loop={true} autoplay={true} {...props} />
        </div>
    );
}
