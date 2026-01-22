"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface CircularProgressProps {
    value: number // 0-100
    size?: number
    strokeWidth?: number
    label?: string
    subLabel?: string
    color?: string
    className?: string
}

export function CircularProgress({
    value,
    size = 120,
    strokeWidth = 10,
    label,
    subLabel,
    color = "text-primary",
    className
}: CircularProgressProps) {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (value / 100) * circumference

    return (
        <div className={cn("relative flex flex-col items-center justify-center", className)}>
            <div className="relative" style={{ width: size, height: size }}>
                {/* Background Circle */}
                <svg className="h-full w-full -rotate-90 transform">
                    <circle
                        className="text-slate-200"
                        strokeWidth={strokeWidth}
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                    {/* Progress Circle */}
                    <circle
                        className={cn("transition-all duration-1000 ease-out", color)}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                </svg>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn("text-2xl font-bold", color)}>{Math.round(value)}%</span>
                </div>
            </div>
            {label && <p className="mt-2 text-sm font-medium text-slate-700">{label}</p>}
            {subLabel && <p className="text-xs text-slate-500">{subLabel}</p>}
        </div>
    )
}
